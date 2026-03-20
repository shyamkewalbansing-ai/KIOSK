import { useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthCallback() {
  const hasProcessed = useRef(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate('/admin/login');
      return;
    }

    const exchangeSession = async () => {
      try {
        const res = await axios.post(`${API}/auth/session`, { session_id: sessionId }, { withCredentials: true });
        login(res.data);
        navigate('/admin', { state: { user: res.data }, replace: true });
      } catch {
        navigate('/admin/login');
      }
    };

    exchangeSession();
  }, [location.hash, navigate, login]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]" data-testid="auth-callback">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#1e3a8a] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600">Even geduld, u wordt ingelogd...</p>
      </div>
    </div>
  );
}
