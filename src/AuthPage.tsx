import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, TrendingUp, ChevronRight, Github, Chrome } from 'lucide-react';
import { useApp } from './AppContext';
import ThreeDCard from './components/ThreeDCard';
import Logo from './components/Logo';

export default function AuthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const { login, loginWithEmail, registerWithEmail } = useApp();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name || !email || !password) {
          setError('Please fill all fields');
          setLoading(false);
          return;
        }
        await registerWithEmail(name, email, password);
      }
    } catch (err: any) {
      console.error("Authentication Error Details:", err);
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid credentials. If this is a new account, please click "Register" first.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password authentication is not enabled in Firebase. Please contact support.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format.');
      } else {
        setError(`Authentication failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      if (!window.location.hash.includes('access_token')) {
         setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login();
    } catch (err) {
      console.error(err);
      setError('Google Authentication failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background FX */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[20%] right-[10%] w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
<div className="mb-6">
              <Logo className="justify-center" textClassName="text-4xl" />
            </div>
           <p className="text-slate-500 mt-2 font-medium tracking-wide uppercase text-xs">Proprietary Trading Ecosystem</p>
        </div>

        <ThreeDCard className="glass p-8 rounded-[32px] border-white/5 relative z-10" glowColor="rgba(0, 242, 255, 0.15)">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mb-8">
            <button 
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${isLogin ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Login
            </button>
            <button 
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${!isLogin ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  key="name"
                >
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe" 
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Email Protocol</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@fundedgoo.com" 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Security Header</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-[10px] font-bold uppercase text-center mt-2">{error}</p>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-cyan-500 text-slate-950 font-bold rounded-2xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'AUTHENTICATING...' : (isLogin ? 'AUTHENTICATE' : 'INITIALIZE ACCOUNT')}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
            <div className="flex items-center gap-4 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
              <div className="h-px flex-1 bg-white/5" />
              <span>Or Authenticate with</span>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            
            <button 
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-xs hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              <Chrome size={16} /> Continue with Google
            </button>
          </div>

        </ThreeDCard>
      </div>
    </div>
  );
}
