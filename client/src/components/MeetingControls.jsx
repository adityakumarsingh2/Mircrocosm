/**
 * MeetingControls – Production-quality WebRTC (Google Meet style)
 *
 * Key design decisions:
 *  - Perfect negotiation: polite peer determined by lexicographic socket ID comparison
 *  - ICE candidate buffering: candidates queued until remote description is set
 *  - Independent mic + camera tracks (audio always works without video)
 *  - Screen share: replaceTrack() on video sender (no renegotiation needed)
 *  - Screen share broadcast: server relays screen-share-started/stopped to room
 *  - Mesh topology: one RTCPeerConnection per remote peer
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, VolumeX, Phone, Grid } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// ── ICE server configuration ───────────────────────────────────────────────
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:stun.relay.metered.ca:80' },
    ],
    iceCandidatePoolSize: 10,
};

const MeetingControls = ({
    socket,
    roomId,
    isHost,
    users,
    onLeave,
    onPeerStreams,
    onMediaState,
    meetingMode,
    onToggleMeetingMode,
    onScreenSharer,        // callback(peerId | null) — who is sharing screen
}) => {
    const { theme } = useTheme();
    const dark = theme === 'dark';

    // ── UI state ──────────────────────────────────────────────────────────────
    const [micOn, setMicOn] = useState(false);
    const [camOn, setCamOn] = useState(false);
    const [screenOn, setScreenOn] = useState(false);

    // ── Refs – survive renders without causing re-renders ─────────────────────
    // One RTCPeerConnection per remote peer: peerId → RTCPeerConnection
    const pcs = useRef(new Map());
    // Pending ICE candidates (before remote description set): peerId → RTCIceCandidate[]
    const pendingCandidates = useRef(new Map());
    // Remote streams: peerId → MediaStream
    const remoteStreams = useRef(new Map());
    // Local stream (audio + video tracks, always the authoritative source)
    const localStreamRef = useRef(new MediaStream());
    // Screen share stream
    const screenStreamRef = useRef(null);
    // Track mic/cam state in ref too (for use inside async callbacks)
    const micOnRef = useRef(false);
    const camOnRef = useRef(false);
    const screenOnRef = useRef(false);
    // Socket ID ref (stale-closure safe)
    const mySocketIdRef = useRef(null);
    // Making-offer guard per peer (for glare handling)
    const makingOfferRef = useRef(new Map());     // peerId → bool
    const ignoreOfferRef = useRef(new Map());      // peerId → bool

    // ── Push remote streams to parent ─────────────────────────────────────────
    const pushStreams = useCallback(() => {
        onPeerStreams?.(new Map(remoteStreams.current));
    }, [onPeerStreams]);

    // ── Push local state to parent ────────────────────────────────────────────
    const pushLocalState = useCallback((mic, cam) => {
        onMediaState?.({ micOn: mic, camOn: cam, stream: localStreamRef.current });
    }, [onMediaState]);

    // ═════════════════════════════════════════════════════════════════════════
    // drain pending ICE candidates after remote description is set
    // ═════════════════════════════════════════════════════════════════════════
    const drainCandidates = useCallback(async (peerId, pc) => {
        const queue = pendingCandidates.current.get(peerId) || [];
        pendingCandidates.current.set(peerId, []);
        for (const candidate of queue) {
            try {
                await pc.addIceCandidate(candidate);
            } catch (err) {
                if (!ignoreOfferRef.current.get(peerId)) {
                    console.warn('[ICE drain]', err.message);
                }
            }
        }
    }, []);

    // ═════════════════════════════════════════════════════════════════════════
    // createPC – create one RTCPeerConnection per remote peer
    // ═════════════════════════════════════════════════════════════════════════
    const createPC = useCallback((peerId) => {
        if (pcs.current.has(peerId)) return pcs.current.get(peerId);

        const pc = new RTCPeerConnection(ICE_CONFIG);
        pcs.current.set(peerId, pc);
        pendingCandidates.current.set(peerId, []);
        makingOfferRef.current.set(peerId, false);
        ignoreOfferRef.current.set(peerId, false);

        // Add all current local tracks to this peer connection
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
        });

        // ── ICE candidates ────────────────────────────────────────────────
        pc.onicecandidate = ({ candidate }) => {
            if (candidate && socket) {
                socket.emit('webrtc-ice-candidate', { targetId: peerId, candidate: candidate.toJSON(), roomId });
            }
        };

        pc.onicecandidateerror = (e) => {
            // Only log meaningful errors
            if (e.errorCode !== 701) console.warn('[ICE error]', e.errorText);
        };

        // ── Perfect negotiation: onnegotiationneeded ──────────────────────
        pc.onnegotiationneeded = async () => {
            try {
                makingOfferRef.current.set(peerId, true);
                const offer = await pc.createOffer();
                if (pc.signalingState !== 'stable') return; // guard against race
                await pc.setLocalDescription(offer);
                socket?.emit('webrtc-offer', {
                    targetId: peerId,
                    offer: pc.localDescription,
                    roomId,
                });
            } catch (err) {
                console.error('[negotiationneeded]', err);
            } finally {
                makingOfferRef.current.set(peerId, false);
            }
        };

        // ── Remote track received ─────────────────────────────────────────
        pc.ontrack = ({ track, streams }) => {
            const remoteStream = streams[0] || new MediaStream();
            if (!remoteStreams.current.has(peerId)) {
                remoteStreams.current.set(peerId, remoteStream);
            } else {
                // Replace same-kind track in existing stream
                const existing = remoteStreams.current.get(peerId);
                existing.getTracks()
                    .filter(t => t.kind === track.kind)
                    .forEach(t => existing.removeTrack(t));
                existing.addTrack(track);
            }

            track.onunmute = () => pushStreams();
            pushStreams();
        };

        // ── Connection state monitoring ────────────────────────────────────
        pc.onconnectionstatechange = () => {
            console.log(`[PC ${peerId.substring(0, 6)}] connectionState: ${pc.connectionState}`);
            if (['failed', 'closed'].includes(pc.connectionState)) {
                pc.close();
                pcs.current.delete(peerId);
                remoteStreams.current.delete(peerId);
                pendingCandidates.current.delete(peerId);
                pushStreams();
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[ICE ${peerId.substring(0, 6)}] iceConnectionState: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'failed') {
                pc.restartIce();
            }
        };

        return pc;
    }, [socket, roomId, pushStreams]);

    // ═════════════════════════════════════════════════════════════════════════
    // Socket event handlers
    // ═════════════════════════════════════════════════════════════════════════
    useEffect(() => {
        if (!socket) return;

        // Capture socket ID
        if (socket.id) mySocketIdRef.current = socket.id;
        socket.on('connect', () => { mySocketIdRef.current = socket.id; });

        // ── A new peer joined the room ─────────────────────────────────────
        const onPeerJoined = ({ peerId }) => {
            console.log('[peer-joined]', peerId);
            const pc = createPC(peerId);

            // If we already have tracks, they're added during createPC.
            // onnegotiationneeded will fire once the connection is ready.
            // But in case it doesn't (no tracks yet), push a manual offer:
            if (localStreamRef.current.getTracks().length > 0) {
                pc.getSenders().forEach(sender => {
                    if (!sender.track) {
                        const matchingTrack = localStreamRef.current.getTracks()
                            .find(t => t.kind === sender.track?.kind);
                        if (matchingTrack) sender.replaceTrack(matchingTrack);
                    }
                });
            }
        };

        // ── Received an offer from a remote peer (perfect negotiation) ─────
        const onOffer = async ({ from, offer }) => {
            const pc = createPC(from);

            // Polite peer: our ID < their ID means we are "polite" and will rollback
            const weArePolite = mySocketIdRef.current < from;
            const offerCollision =
                offer.type === 'offer' &&
                (makingOfferRef.current.get(from) || pc.signalingState !== 'stable');

            if (offerCollision && !weArePolite) {
                // Impolite peer: ignore the colliding offer
                ignoreOfferRef.current.set(from, true);
                return;
            }
            ignoreOfferRef.current.set(from, false);

            try {
                if (offerCollision) {
                    // Polite peer: rollback our own offer and accept theirs
                    await pc.setLocalDescription({ type: 'rollback' });
                }
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                await drainCandidates(from, pc); // apply any buffered ICE

                if (offer.type === 'offer') {
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('webrtc-answer', { targetId: from, answer: pc.localDescription });
                }
            } catch (err) {
                console.error('[onOffer]', err);
            }
        };

        // ── Received an answer from a remote peer ─────────────────────────
        const onAnswer = async ({ from, answer }) => {
            const pc = pcs.current.get(from);
            if (!pc || pc.signalingState === 'stable') return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                await drainCandidates(from, pc); // apply any buffered ICE
            } catch (err) {
                console.error('[onAnswer]', err);
            }
        };

        // ── Received an ICE candidate ─────────────────────────────────────
        const onIce = async ({ from, candidate }) => {
            const pc = pcs.current.get(from);
            const iceCandidate = new RTCIceCandidate(candidate);

            if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
                // Buffer until remote description is set
                if (!pendingCandidates.current.has(from)) {
                    pendingCandidates.current.set(from, []);
                }
                pendingCandidates.current.get(from).push(iceCandidate);
                return;
            }

            try {
                await pc.addIceCandidate(iceCandidate);
            } catch (err) {
                if (!ignoreOfferRef.current.get(from)) {
                    console.warn('[addIceCandidate]', err.message);
                }
            }
        };

        // ── Peer left the room ─────────────────────────────────────────────
        const onPeerLeft = ({ peerId }) => {
            const pc = pcs.current.get(peerId);
            if (pc) { pc.close(); pcs.current.delete(peerId); }
            remoteStreams.current.delete(peerId);
            pendingCandidates.current.delete(peerId);
            pushStreams();
        };

        // ── Host forced mute ──────────────────────────────────────────────
        const onForceMuted = async () => {
            localStreamRef.current.getAudioTracks().forEach(t => {
                t.stop();
                localStreamRef.current.removeTrack(t);
            });
            pcs.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
                if (sender) sender.replaceTrack(null);
            });
            micOnRef.current = false;
            setMicOn(false);
            pushLocalState(false, camOnRef.current);
            socket.emit('media-state-changed', { roomId, micOn: false, camOn: camOnRef.current });
        };

        socket.on('peer-joined', onPeerJoined);
        socket.on('webrtc-offer', onOffer);
        socket.on('webrtc-answer', onAnswer);
        socket.on('webrtc-ice-candidate', onIce);
        socket.on('peer-left', onPeerLeft);
        socket.on('force-muted', onForceMuted);

        return () => {
            socket.off('peer-joined', onPeerJoined);
            socket.off('webrtc-offer', onOffer);
            socket.off('webrtc-answer', onAnswer);
            socket.off('webrtc-ice-candidate', onIce);
            socket.off('peer-left', onPeerLeft);
            socket.off('force-muted', onForceMuted);
        };
    }, [socket, createPC, drainCandidates, pushStreams, pushLocalState, roomId]);

    // ═════════════════════════════════════════════════════════════════════════
    // Track helpers
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Add (or replace) a single track in localStream and all peer connections.
     * If a sender of the same kind already exists, use replaceTrack (no renegotiation).
     * Otherwise addTrack and let onnegotiationneeded handle the offer.
     */
    const applyTrackToPeers = useCallback((track) => {
        localStreamRef.current.addTrack(track);
        pcs.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === track.kind);
            if (sender) {
                sender.replaceTrack(track); // no renegotiation needed
            } else {
                pc.addTrack(track, localStreamRef.current); // triggers onnegotiationneeded
            }
        });
    }, []);

    /** Remove + stop a track by kind from localStream and null-out peer senders */
    const removeTrackFromPeers = useCallback((kind) => {
        localStreamRef.current.getTracks()
            .filter(t => t.kind === kind)
            .forEach(t => {
                t.stop();
                localStreamRef.current.removeTrack(t);
            });
        pcs.current.forEach(pc => {
            const sender = pc.getSenders().find(s => s.track?.kind === kind);
            if (sender) sender.replaceTrack(null); // keeps sender alive (no renegotiation)
        });
    }, []);

    // ═════════════════════════════════════════════════════════════════════════
    // Toggle handlers
    // ═════════════════════════════════════════════════════════════════════════

    const toggleMic = async () => {
        if (micOnRef.current) {
            removeTrackFromPeers('audio');
            micOnRef.current = false;
            setMicOn(false);
            pushLocalState(false, camOnRef.current);
            socket?.emit('media-state-changed', { roomId, micOn: false, camOn: camOnRef.current });
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    }
                });
                const track = stream.getAudioTracks()[0];
                applyTrackToPeers(track);
                micOnRef.current = true;
                setMicOn(true);
                pushLocalState(true, camOnRef.current);
                socket?.emit('media-state-changed', { roomId, micOn: true, camOn: camOnRef.current });
            } catch (err) {
                console.error('[toggleMic]', err);
                alert('Microphone access denied. Please allow microphone permissions in your browser settings.');
            }
        }
    };

    const toggleCam = async () => {
        if (camOnRef.current) {
            removeTrackFromPeers('video');
            camOnRef.current = false;
            setCamOn(false);
            pushLocalState(micOnRef.current, false);
            socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: false });
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                        facingMode: 'user',
                    }
                });
                const track = stream.getVideoTracks()[0];
                // If screen was on, stop it first
                if (screenOnRef.current) {
                    screenStreamRef.current?.getTracks().forEach(t => t.stop());
                    screenStreamRef.current = null;
                    screenOnRef.current = false;
                    setScreenOn(false);
                    socket?.emit('screen-share-stopped', { roomId });
                    onScreenSharer?.(null);
                }
                applyTrackToPeers(track);
                camOnRef.current = true;
                setCamOn(true);
                pushLocalState(micOnRef.current, true);
                socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: true });
            } catch (err) {
                console.error('[toggleCam]', err);
                alert('Camera access denied. Please allow camera permissions in your browser settings.');
            }
        }
    };

    const toggleScreen = async () => {
        if (screenOnRef.current) {
            // Stop screen share
            screenStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStreamRef.current = null;
            screenOnRef.current = false;
            setScreenOn(false);
            socket?.emit('screen-share-stopped', { roomId });
            onScreenSharer?.(null);

            if (camOnRef.current) {
                // Restore camera
                try {
                    const s = await navigator.mediaDevices.getUserMedia({ video: true });
                    const camTrack = s.getVideoTracks()[0];
                    // Remove old video tracks from local stream
                    localStreamRef.current.getVideoTracks().forEach(t => {
                        t.stop();
                        localStreamRef.current.removeTrack(t);
                    });
                    localStreamRef.current.addTrack(camTrack);
                    pcs.current.forEach(pc => {
                        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) sender.replaceTrack(camTrack);
                    });
                    pushLocalState(micOnRef.current, true);
                    socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: true });
                } catch { /* ignore – camera may have been released */ }
            } else {
                // Just null out the video sender
                localStreamRef.current.getVideoTracks().forEach(t => {
                    t.stop();
                    localStreamRef.current.removeTrack(t);
                });
                pcs.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) sender.replaceTrack(null);
                });
                pushLocalState(micOnRef.current, false);
                socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: false });
            }
        } else {
            try {
                const s = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always',
                        displaySurface: 'monitor',
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                        frameRate: { ideal: 15 },
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        suppressLocalAudioPlayback: true,
                    }
                });
                screenStreamRef.current = s;
                const screenVideoTrack = s.getVideoTracks()[0];

                // Replace video in all peer connections (no renegotiation needed)
                // First, make sure there is a sender for video
                localStreamRef.current.getVideoTracks().forEach(t => {
                    if (!camOnRef.current) { t.stop(); }
                    localStreamRef.current.removeTrack(t);
                });
                localStreamRef.current.addTrack(screenVideoTrack);

                pcs.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenVideoTrack);
                    } else {
                        pc.addTrack(screenVideoTrack, localStreamRef.current);
                    }
                });

                screenOnRef.current = true;
                setScreenOn(true);
                socket?.emit('screen-share-started', { roomId });
                onScreenSharer?.('self');
                pushLocalState(micOnRef.current, true);
                socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: true });

                // User stopped sharing via browser chrome
                screenVideoTrack.onended = () => {
                    if (!screenOnRef.current) return; // already handled
                    screenStreamRef.current = null;
                    screenOnRef.current = false;
                    setScreenOn(false);
                    socket?.emit('screen-share-stopped', { roomId });
                    onScreenSharer?.(null);

                    localStreamRef.current.getTracks()
                        .filter(t => t.kind === 'video')
                        .forEach(t => { t.stop(); localStreamRef.current.removeTrack(t); });

                    if (camOnRef.current) {
                        navigator.mediaDevices.getUserMedia({ video: true }).then(cs => {
                            const ct = cs.getVideoTracks()[0];
                            localStreamRef.current.addTrack(ct);
                            pcs.current.forEach(pc => {
                                const snd = pc.getSenders().find(s => s.track?.kind === 'video');
                                if (snd) snd.replaceTrack(ct);
                            });
                            pushLocalState(micOnRef.current, true);
                            socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: true });
                        }).catch(() => { });
                    } else {
                        pcs.current.forEach(pc => {
                            const snd = pc.getSenders().find(s => s.track?.kind === 'video');
                            if (snd) snd.replaceTrack(null);
                        });
                        pushLocalState(micOnRef.current, false);
                        socket?.emit('media-state-changed', { roomId, micOn: micOnRef.current, camOn: false });
                    }
                };
            } catch (err) {
                if (err.name !== 'NotAllowedError') {
                    console.error('[toggleScreen]', err);
                }
                // User cancelled the screen picker — do nothing
            }
        }
    };

    const muteAll = () => socket?.emit('mute-all', { roomId });

    const handleLeave = () => {
        // Stop all tracks
        localStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current?.getTracks().forEach(t => t.stop());
        // Close all peer connections
        pcs.current.forEach(pc => pc.close());
        pcs.current.clear();
        remoteStreams.current.clear();

        if (screenOnRef.current) {
            socket?.emit('screen-share-stopped', { roomId });
        }
        onLeave?.();
    };

    // ═════════════════════════════════════════════════════════════════════════
    const bg = dark ? 'rgba(10,10,10,0.85)' : 'rgba(255,255,255,0.9)';
    const border = dark ? 'rgba(255,255,255,0.05)' : '#e5e7eb';

    const cirBtn = (active, color, danger = false) => ({
        width: '48px', height: '48px', borderRadius: '50%', border: 'none',
        background: danger
            ? (active ? '#ef4444' : 'rgba(239,68,68,0.12)')
            : active
                ? color
                : (dark ? 'rgba(255,255,255,0.07)' : '#f0f1f4'),
        color: (active || danger) ? 'white' : (dark ? '#94a3b8' : '#6b7280'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.18s ease',
        boxShadow: active ? `0 4px 18px ${danger ? '#ef444466' : color + '55'}` : 'none',
        flexShrink: 0,
    });

    return (
        <div style={{
            height: '68px',
            background: bg, backdropFilter: 'blur(20px)',
            borderTop: `1px solid ${border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '12px', padding: '0 2rem',
            flexShrink: 0,
            position: 'relative',
            transition: 'background 0.3s',
        }}>

            {/* ── Live indicator (left) ─────────────────────── */}
            <div style={{
                position: 'absolute', left: '1.25rem',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontSize: '0.7rem', fontWeight: '700',
                color: dark ? '#475569' : '#9ca3af',
            }}>
                <span style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: '#10b981', display: 'inline-block',
                    boxShadow: '0 0 8px #10b981',
                    animation: 'pulse 2s infinite',
                }} />
                Live
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
            </div>

            {/* ── Mic ──────────────────────────────────── */}
            <button style={cirBtn(micOn, '#6366f1')} onClick={toggleMic}
                title={micOn ? 'Mute mic' : 'Unmute mic'}>
                {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </button>

            {/* ── Camera ───────────────────────────────── */}
            <button style={cirBtn(camOn, '#8b5cf6')} onClick={toggleCam}
                title={camOn ? 'Stop camera' : 'Start camera'}>
                {camOn ? <Video size={18} /> : <VideoOff size={18} />}
            </button>

            {/* ── Screen share ─────────────────────────── */}
            <button style={cirBtn(screenOn, '#10b981')} onClick={toggleScreen}
                title={screenOn ? 'Stop sharing' : 'Share screen'}>
                {screenOn ? <MonitorOff size={18} /> : <Monitor size={18} />}
            </button>

            {/* ── Meeting mode toggle ───────────────────── */}
            <button style={cirBtn(meetingMode, '#3b82f6')} onClick={() => onToggleMeetingMode?.(!meetingMode)}
                title={meetingMode ? 'Whiteboard view' : 'Meeting mode'}>
                <Grid size={18} style={{ color: meetingMode ? 'white' : (dark ? '#94a3b8' : '#6b7280') }} />
            </button>

            {/* ── Mute all (host only) ──────────────────── */}
            {isHost && (
                <button onClick={muteAll} style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '0 14px', height: '36px', borderRadius: '18px',
                    background: dark ? 'rgba(220,38,38,0.12)' : '#fef2f2',
                    border: `1px solid ${dark ? '#7f1d1d' : '#fecaca'}`,
                    color: '#dc2626', fontWeight: '700', fontSize: '0.75rem',
                    cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                    <VolumeX size={14} /> Mute All
                </button>
            )}

            <div style={{ width: '1px', height: '28px', background: border, margin: '0 2px' }} />

            {/* ── Leave ────────────────────────────────── */}
            <button style={cirBtn(true, '#ef4444', true)} onClick={handleLeave} title="Leave room">
                <Phone size={16} style={{ transform: 'rotate(135deg)' }} />
            </button>

            {/* ── Screen sharing indicator (right) ─────── */}
            {screenOn && (
                <div style={{
                    position: 'absolute', right: '1.25rem',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    fontSize: '0.73rem', color: '#10b981', fontWeight: '700',
                }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                    You're sharing
                </div>
            )}
        </div>
    );
};

export default MeetingControls;
