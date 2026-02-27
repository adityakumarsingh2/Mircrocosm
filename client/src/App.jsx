import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Whiteboard from './pages/Whiteboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'
import Navbar from './components/Navbar'

function App() {
    const location = useLocation();
    const isWhiteboard = location.pathname.startsWith('/whiteboard/');

    return (
        <div className="App">
            {!isWhiteboard && <Navbar />}
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/dashboard" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                    path="/whiteboard/:roomId"
                    element={
                        <ProtectedRoute>
                            <Whiteboard />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </div>
    )
}

export default App

