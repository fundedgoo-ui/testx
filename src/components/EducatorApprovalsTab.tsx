import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { 
  Check, 
  X, 
  Trash2, 
  Award, 
  Calendar, 
  TrendingUp, 
  CheckCircle, 
  XCircle, 
  Info, 
  UserCheck, 
  ShieldAlert, 
  Video, 
  Plus, 
  DollarSign 
} from 'lucide-react';
import { doc, updateDoc, onSnapshot, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { EducatorProfile, EducatorCourse, ContentType } from '../types';

export default function EducatorApprovalsTab() {
  const { educators, transactions, users, addNotification } = useApp();
  const [activeTab, setActiveTab] = useState<'approvals' | 'courses' | 'verification' | 'educators'>('approvals');
  const [selectedEducator, setSelectedEducator] = useState<EducatorProfile | null>(null);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', price: 0, contentType: 'youtube' as ContentType, contentUrl: '' });
  
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [posts, setPosts] = useState<any[]>([]);
  const [autoAward, setAutoAward] = useState(true);
  
  const pending = educators.filter(e => e.status === 'pending');
  
  // Real-time synchronization of posts to calculate accuracy stats
  useEffect(() => {
    const unsubPosts = onSnapshot(collection(db, 'posts'), (snap) => {
      setPosts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Admin posts loading failed:", err));
    return unsubPosts;
  }, []);

  // Retrieve auto-award setting
  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system', 'educatorSettings'), (snap) => {
      if (snap.exists()) {
        setAutoAward(snap.data().autoAwardMasterMentor !== false);
      } else {
        setDoc(doc(db, 'system', 'educatorSettings'), { autoAwardMasterMentor: true }).catch(console.error);
      }
    });
    return unsubSettings;
  }, []);

  const toggleAutoAwardSetting = async () => {
    try {
      const nextSetting = !autoAward;
      await setDoc(doc(db, 'system', 'educatorSettings'), { autoAwardMasterMentor: nextSetting });
    } catch (e) {
      console.error("Setting error:", e);
      alert("Failed to update auto-award setting");
    }
  };

  const getEducatorEmail = (educator: EducatorProfile) => {
    const user = users.find(u => u.id === educator.userId);
    return user?.email || 'N/A';
  };

  const calculateEducatorStats = (userId: string) => {
    const educatorPosts = posts.filter(p => p.userId === userId);
    
    // Group posts by YYYY-MM-DD
    const postsByDay: Record<string, any[]> = {};
    educatorPosts.forEach(post => {
      if (!post.createdAt) return;
      const day = new Date(post.createdAt).toISOString().split('T')[0];
      if (!postsByDay[day]) {
        postsByDay[day] = [];
      }
      postsByDay[day].push(post);
    });

    const uniqueDays = Object.keys(postsByDay).length;
    
    // Count how many unique days have at least one post where Correct > Incorrect votes
    let correctDaysCount = 0;
    Object.values(postsByDay).forEach(dayPosts => {
      const hasCorrectPost = dayPosts.some(post => {
        const correctCount = Array.isArray(post.correctVotes) ? post.correctVotes.length : 0;
        const incorrectCount = Array.isArray(post.incorrectVotes) ? post.incorrectVotes.length : 0;
        return correctCount > incorrectCount;
      });
      if (hasCorrectPost) {
        correctDaysCount++;
      }
    });

    const winRate = uniqueDays > 0 ? Math.round((correctDaysCount / uniqueDays) * 100) : 0;
    const isEligible = uniqueDays >= 10 && correctDaysCount >= 6;

    return {
      totalPosts: educatorPosts.length,
      uniqueDays,
      correctDaysCount,
      winRate,
      isEligible
    };
  };

  const updateEducatorStatus = async (educator: EducatorProfile, status: 'approved' | 'rejected', tier?: 'bronze' | 'silver' | 'gold' | 'platinum') => {
    try {
      const updateData: any = { status };
      if (tier) updateData.tier = tier;
      await updateDoc(doc(db, 'educators', educator.id), updateData);

      addNotification({
        title: `Mentorship Application ${status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: status === 'approved' 
           ? `Congratulations! Your mentorship application has been approved. ${reasons[educator.id] || ""}`
           : `Your mentorship application has been rejected. ${reasons[educator.id] || "No further explanation provided."}`,
        type: status === 'approved' ? 'success' : 'alert',
      }, educator.userId);
      setReasons(prev => { const next = {...prev}; delete next[educator.id]; return next; });
    } catch (error) {
      console.error("Error updating educator status:", error);
      alert("Error updating status");
    }
  };

  const toggleProStatus = async (id: string, currentStatus: boolean | undefined) => {
    try {
      await updateDoc(doc(db, 'educators', id), { isPro: !currentStatus });
    } catch (error) {
      console.error("Error updating pro status:", error);
      alert("Error updating status");
    }
  };

  const toggleMasterMentorBadge = async (educator: EducatorProfile) => {
    const currentlyHas = !!educator.hasMasterMentorBadge;
    try {
      await updateDoc(doc(db, 'educators', educator.id), { hasMasterMentorBadge: !currentlyHas });
      
      addNotification({
        title: !currentlyHas ? "Master Mentor badge awarded!" : "Master Mentor badge status updated",
        message: !currentlyHas 
          ? "Congratulations! The administrator has manually awarded you the prestigious MASTER MENTOR badge on your profile!"
          : "The administrator has updated your Master Mentor badge profile status.",
        type: !currentlyHas ? 'success' : 'alert'
      }, educator.userId);
      
      alert(`Master Mentor badge ${!currentlyHas ? 'AWARDED' : 'REVOKED'} successfully for ${educator.name}!`);
    } catch (error) {
      console.error("Error updating Master Mentor status:", error);
      alert("Error updating status");
    }
  };

  const addCourse = async () => {
    if (!selectedEducator) return;
    try {
      const course: EducatorCourse = {
        ...newCourse,
        id: `course-${Date.now()}`,
        isSubscription: false,
        createdAt: Date.now()
      };
      await updateDoc(doc(db, 'educators', selectedEducator.id), {
        courses: [...(selectedEducator.courses || []), course]
      });
      setNewCourse({ title: '', description: '', price: 0, contentType: 'youtube', contentUrl: '' });
      alert("Course added successfully");
    } catch (e) {
      alert("Error adding course");
    }
  };

  const deleteCourse = async (educatorId: string, courseId: string) => {
    const educator = educators.find(e => e.id === educatorId);
    if (!educator) return;
    try {
      await updateDoc(doc(db, 'educators', educatorId), {
        courses: educator.courses.filter(c => c.id !== courseId)
      });
    } catch (e) {
      alert("Error deleting course");
    }
  };

  return (
    <div className="glass p-8 rounded-3xl border border-white/5 bg-white/5 space-y-6">
      <h3 className="font-display font-bold text-xl text-white uppercase tracking-tighter">Educator Administration</h3>
      
      <div className="flex gap-4 border-b border-white/10 pb-4">
        {['Approvals', 'Courses', 'Verification', 'Educators'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab.toLowerCase() as any)}
            className={`px-4 py-2 font-bold transition-colors ${activeTab === tab.toLowerCase() ? 'text-azure border-b-2 border-azure' : 'text-slate-400 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {pending.length === 0 && <p className="text-slate-500 italic">No pending applications</p>}
          {pending.map(e => (
            <div key={e.id} className="p-4 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{e.name}</p>
                <p className="text-slate-400 text-xs">{getEducatorEmail(e)}</p>
              </div>
              <div className="flex gap-2">
                <input 
                  placeholder="Reason / Explanation (Optional)"
                  value={reasons[e.id] || ""}
                  onChange={(val) => setReasons(prev => ({...prev, [e.id]: val.target.value}))}
                  className="bg-slate-800 text-white rounded p-1 text-xs"
                />
                <select onChange={(val) => updateEducatorStatus(e, 'approved', val.target.value as any)} className="bg-slate-800 text-white rounded p-1 text-xs">
                   <option value="bronze">Bronze</option>
                   <option value="silver">Silver</option>
                   <option value="gold">Gold</option>
                   <option value="platinum">Platinum</option>
                </select>
                <button onClick={() => updateEducatorStatus(e, 'rejected')} className="bg-red-500/20 text-red-400 p-2 rounded-lg hover:bg-red-500/30">
                   <X size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'courses' && (
        <div className="space-y-6">
          <select 
            onChange={(e) => setSelectedEducator(educators.find(ed => ed.id === e.target.value) || null)} 
            className="w-full bg-slate-800 text-white p-3 rounded-xl"
            value={selectedEducator?.id || ''}
          >
            <option value="">Select Educator</option>
            {educators.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          
          {selectedEducator && (
            <>
              <div className="p-4 bg-slate-800 rounded-xl space-y-4 font-normal">
                 <input placeholder="Title" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} className="w-full bg-slate-900 p-2 rounded text-white"/>
                 <input placeholder="Description" value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} className="w-full bg-slate-900 p-2 rounded text-white"/>
                 <input type="number" placeholder="Price" value={newCourse.price} onChange={e => setNewCourse({...newCourse, price: parseFloat(e.target.value)})} className="w-full bg-slate-900 p-2 rounded text-white"/>
                 <select value={newCourse.contentType} onChange={e => setNewCourse({...newCourse, contentType: e.target.value as any})} className="w-full bg-slate-900 p-2 rounded text-white">
                    <option value="youtube">Youtube Link</option>
                    <option value="pdf">PDF URL</option>
                 </select>
                 <input placeholder="URL" value={newCourse.contentUrl} onChange={e => setNewCourse({...newCourse, contentUrl: e.target.value})} className="w-full bg-slate-900 p-2 rounded text-white"/>
                 <button onClick={addCourse} className="bg-azure w-full p-3 rounded-lg text-white font-bold uppercase tracking-wider text-xs">Add Course</button>
              </div>
              
              <div className="space-y-2">
                 {selectedEducator.courses?.map(c => (
                    <div key={c.id} className="flex justify-between p-3 bg-slate-900 rounded-lg text-white">
                       {c.title}
                       <button onClick={() => deleteCourse(selectedEducator.id, c.id)} className="text-red-400"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 📊 NEW Verification Test tab with stats tracking & manual toggles */}
      {activeTab === 'verification' && (
        <div className="space-y-6">
          {/* Automatic Badge allocation engine switch */}
          <div className="p-5 bg-slate-900 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-white uppercase tracking-tight text-sm">Automatic Verification Engine</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                When active, candidates who write posts on at least **10 different days** with **60% positive ratings** are instantly awarded the Master Mentor badge.
              </p>
            </div>
            <button 
              onClick={toggleAutoAwardSetting}
              className={`px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider text-xs transition-all ${
                autoAward 
                  ? 'bg-green-500 text-slate-950 shadow-[0_0_15px_rgba(34,197,94,0.3)]' 
                  : 'bg-slate-800 text-slate-400 border border-white/5'
              }`}
            >
              {autoAward ? 'AUTO-AWARD ACTIVE' : 'AUTO-AWARD DISABLED'}
            </button>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Applicant Consistency Portfolios</h4>
            
            {educators.length === 0 ? (
              <p className="text-slate-500 italic">No mentors registered.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {educators.map(e => {
                  const stats = calculateEducatorStats(e.userId);
                  
                  return (
                    <div key={e.id} className="p-5 bg-slate-900/60 border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-md">{e.name}</span>
                          <span className="text-[10px] bg-white/5 text-slate-400 border border-white/5 px-2 py-0.5 rounded-full uppercase">
                            STATUS: {e.status}
                          </span>
                          {e.hasMasterMentorBadge && (
                            <span className="flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              <Award size={10} /> MASTER MENTOR
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 max-w-xl">{e.bio}</p>

                        {/* Visual statistics */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-500" />
                            <span>Unique days: <strong className={stats.uniqueDays >= 10 ? 'text-green-400' : 'text-slate-200'}>{stats.uniqueDays} / 10</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-green-500" />
                            <span>Correct Setups: <strong className={stats.correctDaysCount >= 6 ? 'text-green-400' : 'text-slate-200'}>{stats.correctDaysCount} / 6</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-azure" />
                            <span>Win Rate: <strong className="text-azure">{stats.winRate}%</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                            <span>({stats.totalPosts} total published configurations)</span>
                          </div>
                        </div>
                      </div>

                      {/* Manual overriding badge controls */}
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => toggleMasterMentorBadge(e)}
                          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                            e.hasMasterMentorBadge 
                              ? 'bg-amber-500/15 border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-950' 
                              : 'bg-slate-950 border-white/5 text-slate-400 hover:border-amber-500 hover:text-amber-400'
                          }`}
                        >
                          <Award size={14} />
                          {e.hasMasterMentorBadge ? 'REVOKE BADGE' : 'MANUALLY AWARD BADGE'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'educators' && (
        <div className="space-y-4">
          {educators.map(e => (
            <div key={e.id} className="p-4 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-between">
              <div>
                <p className="text-white font-bold">{e.name}</p>
                <p className="text-slate-400 text-xs">{getEducatorEmail(e)} - Status: {e.status}</p>
              </div>
              <div className="flex gap-4 items-center">
                 <button onClick={() => toggleProStatus(e.id, e.isPro)} className={`flex gap-1 items-center px-3 py-1 rounded-full text-xs font-bold ${e.isPro ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-300'}`}>
                    <Award size={14}/>
                    {e.isPro ? 'VERIFIED PRO' : 'VERIFY PRO'}
                 </button>
                 <div className="text-azure font-bold uppercase text-xs">{e.tier || 'No Tier'}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
