import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  where, 
  getDocs, 
  deleteDoc, 
  updateDoc, 
  doc, 
  setDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useApp } from '../AppContext';
import { motion } from 'motion/react';
import { 
  Award, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  TrendingUp, 
  Calendar, 
  Info, 
  Clock, 
  GraduationCap, 
  ThumbsUp, 
  Heart, 
  MessageCircle, 
  Send, 
  Check, 
  X,
  Upload,
  UserCheck,
  Sparkles,
  Brain
} from 'lucide-react';
import { EducatorProfile } from '../types';
import { rulesTranslations } from '../lib/rulesTranslations';

const compressAndGetBase64 = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Limit max dimension to 800px for ultra-lightweight size in local storage
          const MAX_DIM = 800;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            } else {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
            resolve(compressedDataUrl);
          } else {
            resolve(dataUrl);
          }
        } catch (err) {
          console.warn("Canvas compression failed, using original dataUrl:", err);
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    };
    reader.onerror = () => {
      resolve("");
    };
  });
};

const dataURLToBlob = (dataURL: string): Blob => {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

export default function MarketView() {
  const { user, educators, setActiveView, addNotification, fetchWithAuth } = useApp();
  const [posts, setPosts] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [autoAward, setAutoAward] = useState(true);
  const [showForumRulesModal, setShowForumRulesModal] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState<boolean | null>(null);
  const [lang, setLang] = useState<'en' | 'es' | 'fr'>(() => (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en');
  const [adminVoteQuantities, setAdminVoteQuantities] = useState<Record<string, number>>({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('has_accepted_market_forum_rules') === 'true';
    setRulesAccepted(hasAccepted);
  }, []);

  useEffect(() => {
    const handleLangChange = () => {
      const currentLang = (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en';
      setLang(currentLang);
    };
    window.addEventListener('market_forum_lang_change', handleLangChange);
    return () => window.removeEventListener('market_forum_lang_change', handleLangChange);
  }, []);

  const changeLang = (newLang: 'en' | 'es' | 'fr') => {
    setLang(newLang);
    localStorage.setItem('market_forum_lang', newLang);
    window.dispatchEvent(new Event('market_forum_lang_change'));
  };

  const T = rulesTranslations[lang];

  const handleAcceptRules = () => {
    localStorage.setItem('has_accepted_market_forum_rules', 'true');
    setRulesAccepted(true);
    addNotification({
      title: "Guidelines Accepted",
      message: "Welcome to the Market Analysis Forum!",
      type: "success"
    });
  };

  // AI Analysis State
  const [analyses, setAnalyses] = useState<Record<string, any>>({});
  const [analyzingPostId, setAnalyzingPostId] = useState<string | null>(null);

  const analyzePostWithAI = async (post: any) => {
    try {
      setAnalyzingPostId(post.id);
      
      if (!user) {
        addNotification({
          title: "Authentication error",
          message: "You must be logged in to use AI analysis.",
          type: "alert"
        });
        setAnalyzingPostId(null);
        return;
      }

      const data = await fetchWithAuth('/api/gemini/analyze-post', {
        method: 'POST',
        body: JSON.stringify({
          description: post.description,
          authorName: post.authorName || 'Mentor'
        })
      });

      setAnalyses(prev => ({
        ...prev,
        [post.id]: data
      }));
      addNotification({
        title: "AI Analysis Completed",
        message: "Strategic analysis generated successfully!",
        type: "success"
      });
    } catch (err: any) {
      console.error(err);
      addNotification({
        title: "AI Analysis Error",
        message: err.message || "Could not generate AI analysis.",
        type: "alert"
      });
    } finally {
      setAnalyzingPostId(null);
    }
  };

  // Check if current user is an educator / mentor (either pending or approved)
  const currentEducator = educators.find(e => e.userId === user?.id);
  const isApprovedMentor = currentEducator?.status === 'approved';
  const isPendingMentor = currentEducator?.status === 'pending';
  const canPublish = isApprovedMentor || isPendingMentor;

  // Retrieve autoAward setting
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

  // Fetch posts from last 30 days to have enough window for tracking
  useEffect(() => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    
    // Cleanup old posts beyond 30 days
    const cleanupOldPosts = async () => {
      try {
        const q = query(collection(db, 'posts'), where('createdAt', '<', thirtyDaysAgo));
        const snapshot = await getDocs(q);
        snapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      } catch (e) {
        console.error("Cleanup error:", e);
      }
    };
    cleanupOldPosts();

    const q = query(
      collection(db, 'posts'), 
      where('createdAt', '>', thirtyDaysAgo), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Firestore loading error:", err);
    });
    return unsubscribe;
  }, []);

  // Load local posts and sync with firestore posts
  const [localPosts, setLocalPosts] = useState<any[]>([]);

  useEffect(() => {
    const loaded = localStorage.getItem('local_market_posts');
    if (loaded) {
      try {
        setLocalPosts(JSON.parse(loaded));
      } catch (e) {
        console.error("Error parsing local posts:", e);
      }
    }
  }, []);

  // Combine firestore and local posts, removing duplicates by id
  const allPosts = useMemo(() => {
    const combined = [...localPosts, ...posts];
    const unique: any[] = [];
    const seen = new Set();
    for (const post of combined) {
      if (!post.id) continue;
      if (!seen.has(post.id)) {
        seen.add(post.id);
        unique.push(post);
      }
    }
    // Sort by createdAt desc
    return unique.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [posts, localPosts]);

  const selectedPost = useMemo(() => {
    return allPosts.find(p => p.id === selectedPostId) || null;
  }, [allPosts, selectedPostId]);

  // Helper to update locally and on Firestore
  const updatePostLocallyAndOnDb = async (postId: string, updateData: any) => {
    // 1. Update in localPosts
    setLocalPosts(prev => {
      const updated = prev.map(p => p.id === postId ? { ...p, ...updateData } : p);
      localStorage.setItem('local_market_posts', JSON.stringify(updated));
      return updated;
    });

    // 2. Try to update in Firestore
    try {
      const postDocRef = doc(db, 'posts', postId);
      await updateDoc(postDocRef, updateData);
    } catch (err) {
      console.warn("Firestore update postponed/failed:", err);
    }
  };

  // Helper to delete locally and on Firestore
  const deletePostLocallyAndOnDb = async (postId: string) => {
    // 1. Delete from localPosts
    setLocalPosts(prev => {
      const updated = prev.filter(p => p.id !== postId);
      localStorage.setItem('local_market_posts', JSON.stringify(updated));
      return updated;
    });

    // 2. Try to delete from Firestore
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.warn("Firestore delete postponed/failed:", err);
    }
  };

  // Calculate stats for current user's educator validation if they have a profile
  const myPosts = useMemo(() => {
    return allPosts.filter(p => p.userId === user?.id);
  }, [allPosts, user?.id]);
  
  const calculateTestStats = (userPosts: any[]) => {
    // Group posts by YYYY-MM-DD
    const postsByDay: Record<string, any[]> = {};
    userPosts.forEach(post => {
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
      uniqueDays,        // total days posted (max needs 10)
      correctDaysCount,  // total days with successful correct analysis (needs 6)
      winRate,           // current win rate of daily analysis
      isEligible,        // passes verification test
      progressPercent: Math.min(100, Math.round((uniqueDays / 10) * 100)),
      correctPercent: uniqueDays > 0 ? Math.min(100, Math.round((correctDaysCount / 6) * 100)) : 0
    };
  };

  const myStats = calculateTestStats(myPosts);

  // Check if they posted today (within custom timezone calendar day) to prevent multiple posts per day
  const hasPostedToday = () => {
    if (myPosts.length === 0) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    return myPosts.some(p => new Date(p.createdAt).toISOString().split('T')[0] === todayStr);
  };

  const checkAndAwardMasterMentorBadge = async (userId: string, educatorId: string, currentPosts: any[]) => {
    try {
      const stats = calculateTestStats(currentPosts);
      const educatorDoc = doc(db, 'educators', educatorId);
      
      const targetEducator = educators.find(e => e.id === educatorId);
      const currentlyHasBadge = targetEducator?.hasMasterMentorBadge || false;

      if (stats.isEligible && !currentlyHasBadge) {
        await updateDoc(educatorDoc, {
          hasMasterMentorBadge: true
        });
        
        addNotification({
          title: "Master Mentor Badge Awarded!",
          message: `Congratulations! ${targetEducator?.name || 'You'} successfully passed the Market Analysis verification test and have been awarded the MASTER MENTOR badge!`,
          type: 'success'
        }, userId);
        
        console.log(`[Auto-award] Successfully awarded Master Mentor badge to user ${userId}`);
      } else if (!stats.isEligible && currentlyHasBadge) {
        // If they fall below standard due to user ratings changing, optionally we can decide whether to remove or keep. 
        // Typically we keep or we synch. Let's do nothing to be safe, or sync but keep.
      }
    } catch (error) {
      console.error("Error auto-awarding badge:", error);
    }
  };

  const handleUpload = async () => {
    if (!auth.currentUser || !user) {
      alert("You must be logged in to post.");
      return;
    }
    if (!canPublish) {
      alert("Only mentors and candidates can post.");
      return;
    }
    if (hasPostedToday()) {
      alert("Consistency Test Rule: You can only post once per calendar day. Keep it clean and verified!");
      return;
    }
    if (!image) {
      alert("Please select a technical analysis chart or image to post.");
      return;
    }
    if (!description.trim()) {
      alert("Please provide a short descriptions/reasoning for your technical analysis.");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // 1. Instantly compress and get base64 (this is extremely fast and ensures we have the image data locally)
      const base64Url = await compressAndGetBase64(image);
      const postId = "post_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      
      const newPostData = {
        id: postId,
        userId: auth.currentUser.uid,
        authorName: user.name || "Verified Trader",
        authorAvatar: user.avatar || "",
        imageUrl: base64Url,
        description,
        correctVotes: [],
        incorrectVotes: [],
        createdAt: Date.now()
      };

      // 2. Save locally immediately so it renders instantly in the UI
      setLocalPosts(prev => {
        const updated = [newPostData, ...prev];
        localStorage.setItem('local_market_posts', JSON.stringify(updated));
        return updated;
      });

      // 3. Reset form and stop loader immediately for instant feedback
      setIsUploading(false);
      setDescription('');
      setImage(null);
      alert("Analysis posted successfully!");

      // 4. Trigger auto-award check right away using local state
      if (currentEducator && autoAward) {
        const updatedPosts = [newPostData, ...myPosts];
        await checkAndAwardMasterMentorBadge(user.id, currentEducator.id, updatedPosts);
      }

      // 5. Sync to Firestore in the background
      setTimeout(async () => {
        try {
          // Attempt to upload to real Storage first if possible
          let finalImageUrl = base64Url;
          try {
            const storageRef = ref(storage, `posts/${auth.currentUser?.uid}/${Date.now()}`);
            const compressedBlob = dataURLToBlob(base64Url);
            await uploadBytes(storageRef, compressedBlob);
            finalImageUrl = await getDownloadURL(storageRef);
          } catch (storageError) {
            console.warn("Storage upload failed, falling back to local base64:", storageError);
          }

          // Write with the exact same ID so it replaces the local version seamlessly without duplicates
          const finalPostData = {
            ...newPostData,
            imageUrl: finalImageUrl
          };

          await setDoc(doc(db, 'posts', postId), finalPostData);
          console.log("Successfully synced post to Firestore:", postId);
        } catch (firestoreError) {
          console.error("Failed to sync post to Firestore background database:", firestoreError);
        }
      }, 50);

    } catch (error) {
      console.error("Upload error:", error);
      alert(`Upload error: ${error instanceof Error ? error.message : String(error)}`);
      setIsUploading(false);
    }
  };

  const handleVote = async (post: any, voteType: 'correct' | 'incorrect') => {
    if (!auth.currentUser) {
      alert("You must be logged in to vote.");
      return;
    }
    const currentUid = auth.currentUser.uid;
    
    let correctVotes = Array.isArray(post.correctVotes) ? [...post.correctVotes] : [];
    let incorrectVotes = Array.isArray(post.incorrectVotes) ? [...post.incorrectVotes] : [];

    const isCorrectIndex = correctVotes.indexOf(currentUid);
    const isIncorrectIndex = incorrectVotes.indexOf(currentUid);

    if (voteType === 'correct') {
      if (isCorrectIndex > -1) {
        // Toggle off
        correctVotes.splice(isCorrectIndex, 1);
      } else {
        // Vote Correct, remove from Incorrect
        correctVotes.push(currentUid);
        if (isIncorrectIndex > -1) {
          incorrectVotes.splice(isIncorrectIndex, 1);
        }
      }
    } else {
      if (isIncorrectIndex > -1) {
        // Toggle off
        incorrectVotes.splice(isIncorrectIndex, 1);
      } else {
        // Vote Incorrect, remove from Correct
        incorrectVotes.push(currentUid);
        if (isCorrectIndex > -1) {
          correctVotes.splice(isCorrectIndex, 1);
        }
      }
    }

    await updatePostLocallyAndOnDb(post.id, { correctVotes, incorrectVotes });

    // Run auto-award trigger for the post creator
    const targetEducator = educators.find(e => e.userId === post.userId);
    if (targetEducator && autoAward) {
      try {
        const creatorPosts = allPosts.map(p => {
          if (p.id === post.id) {
            return { ...p, correctVotes, incorrectVotes };
          }
          return p;
        }).filter(p => p.userId === post.userId);
        await checkAndAwardMasterMentorBadge(post.userId, targetEducator.id, creatorPosts);
      } catch (err) {
        console.error("Auto-award check error:", err);
      }
    }
  };

  const handleAdminVotes = async (post: any, voteType: 'correct' | 'incorrect') => {
    const qty = adminVoteQuantities[post.id] ?? 10;
    
    let correctVotes = Array.isArray(post.correctVotes) ? [...post.correctVotes] : [];
    let incorrectVotes = Array.isArray(post.incorrectVotes) ? [...post.incorrectVotes] : [];
    
    // Generate 'qty' random votes
    const newVotes: string[] = [];
    for (let i = 0; i < qty; i++) {
      newVotes.push(`admin_vote_${voteType}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
    }
    
    if (voteType === 'correct') {
      correctVotes = [...correctVotes, ...newVotes];
    } else {
      incorrectVotes = [...incorrectVotes, ...newVotes];
    }
    
    await updatePostLocallyAndOnDb(post.id, { correctVotes, incorrectVotes });
    
    addNotification({
      title: "Voturi Admin Adăugate",
      message: `S-au adăugat cu succes ${qty} voturi "${voteType === 'correct' ? 'Corecte' : 'Incorecte'}" la postare.`,
      type: "success"
    });
    
    // Run auto-award trigger for the post creator
    const targetEducator = educators.find(e => e.userId === post.userId);
    if (targetEducator && autoAward) {
      try {
        const creatorPosts = allPosts.map(p => {
          if (p.id === post.id) {
            return { ...p, correctVotes, incorrectVotes };
          }
          return p;
        }).filter(p => p.userId === post.userId);
        await checkAndAwardMasterMentorBadge(post.userId, targetEducator.id, creatorPosts);
      } catch (err) {
        console.error("Auto-award check error:", err);
      }
    }
  };

  const handleClearAdminVotes = async (post: any) => {
    if (!confirm("Ești sigur că vrei să resetezi toate voturile la această postare?")) {
      return;
    }
    await updatePostLocallyAndOnDb(post.id, { correctVotes: [], incorrectVotes: [] });
    
    addNotification({
      title: "Voturi Resetate",
      message: "Toate voturile au fost resetate pentru această postare.",
      type: "success"
    });
  };

  const getTierBadgeStyles = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'platinum': return 'bg-slate-300/10 text-slate-100 border-slate-300/40 shadow-[0_0_10px_rgba(203,213,225,0.15)]';
      case 'gold': return 'bg-amber-400/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]';
      case 'silver': return 'bg-blue-400/10 text-blue-400 border-blue-400/30';
      default: return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  if (rulesAccepted === false) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 min-h-[80vh] flex items-center justify-center max-w-2xl mx-auto text-white">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl w-full flex flex-col text-slate-300"
        >
          {/* Header with Flags */}
          <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-azure rounded-xl">
                <TrendingUp size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{T.Title}</h2>
                <p className="text-xs text-slate-400">{T.Subtitle_Gate}</p>
              </div>
            </div>

            {/* Language Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start sm:self-auto shrink-0">
              <button
                onClick={() => changeLang('en')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="English"
              >
                <span>🇬🇧</span>
                <span className="text-[10px]">EN</span>
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${lang === 'es' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Español"
              >
                <span>🇪🇸</span>
                <span className="text-[10px]">ES</span>
              </button>
              <button
                onClick={() => changeLang('fr')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${lang === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Français"
              >
                <span>🇫🇷</span>
                <span className="text-[10px]">FR</span>
              </button>
            </div>
          </div>
          
          {/* Body */}
          <div className="p-6 space-y-6 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
            <p className="text-xs text-slate-400">
              {T.Intro}
            </p>

            {/* Rule 1: Who Can Post */}
            <div className="flex gap-4">
              <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-azure shrink-0 h-10 w-10 flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs mb-1">{T.R1_Title}</h3>
                <p className="text-slate-400 text-[11px] leading-normal">
                  {T.R1_Desc}
                </p>
              </div>
            </div>

            {/* Rule 2: Anti-Spam Control */}
            <div className="flex gap-4">
              <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs mb-1">{T.R2_Title}</h3>
                <p className="text-slate-400 text-[11px] leading-normal">
                  {T.R2_Desc}
                </p>
              </div>
            </div>

            {/* Rule 3: Community Votes */}
            <div className="flex gap-4">
              <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-green-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <ThumbsUp size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs mb-1">{T.R3_Title}</h3>
                <p className="text-slate-400 text-[11px] leading-normal">
                  {T.R3_Desc}
                </p>
              </div>
            </div>

            {/* Rule 4: Master Mentor Challenge */}
            <div className="flex gap-4">
              <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-purple-400 shrink-0 h-10 w-10 flex items-center justify-center">
                <Award size={20} />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs mb-1">{T.R4_Title}</h3>
                <p className="text-slate-400 text-[11px] leading-normal">
                  {T.R4_Desc}
                </p>
              </div>
            </div>

            {/* Rule 5: Strict Conduct Warning */}
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
              <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="font-bold text-red-400 text-[11px] uppercase tracking-wider mb-1">{T.R5_Title}</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {T.R5_Desc}
                </p>
              </div>
            </div>

          </div>
          
          {/* Footer with Accept & Reject buttons */}
          <div className="p-4 bg-slate-950/40 border-t border-white/5 flex gap-3 justify-end">
            <button 
              onClick={() => setActiveView('dashboard')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-750 hover:text-white text-slate-300 font-bold rounded-xl transition-all text-xs"
            >
              {T.Btn_Reject}
            </button>
            <button 
              onClick={handleAcceptRules}
              className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-[0_4px_12px_rgba(59,130,246,0.3)] transition-all text-xs flex items-center gap-1.5"
            >
              <Check size={14} />
              {T.Btn_Accept}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 text-white min-h-screen bg-slate-950 max-w-5xl mx-auto">
      {/* 🚀 Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-azure text-xs font-bold uppercase tracking-widest">
            <TrendingUp size={16} /> Community Market Feed
          </div>
          <h1 className="text-3xl font-display font-black uppercase tracking-tighter mt-1 bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Market Analysis Forum
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Where verified mentors publish charts, live forecasts, and strategies. Support them by casting your Correct/Incorrect vote!
          </p>
        </div>
        
        {/* Settings Badge status */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowForumRulesModal(true)}
            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all border border-white/10 flex items-center gap-1.5 text-[11px] shadow-[0_2px_8px_rgba(0,0,0,0.1)] uppercase"
          >
            <Info size={13} className="text-amber-400" />
            FORUM RULES & INFO
          </button>

          <div className="glass px-4 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/5 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${autoAward ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></span>
            <span>Automatic Rank Engine: <strong className="text-white uppercase">{autoAward ? 'Enabled' : 'Disabled'}</strong></span>
          </div>
        </div>
      </div>

      {/* 🎓 Tracker Section for Candidates / Applicants */}
      {isPendingMentor && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-amber-500/10 via-yellow-600/5 to-transparent border border-amber-500/20 p-6 rounded-3xl"
        >
          <div className="absolute top-4 right-4 text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            <Clock size={14} className="animate-spin" style={{ animationDuration: '4s' }} /> Candidate verification
          </div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-amber-400 mt-1">
              <GraduationCap size={28} />
            </div>
            <div className="space-y-4 flex-1">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  Mentor Verification Challenge
                </h3>
                <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                  Deploy 10 technical analyses on different days. Secure a positive win rate of at least 60% (6+ posts with more <strong>CORRECT</strong> than <strong>INCORRECT</strong> votes) to unlock the prestigious <span className="text-amber-400 font-bold">MASTER MENTOR</span> badge and list paid courses!
                </p>
              </div>

              {/* Bento Progress Blocks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center justify-between">
                    <span>10 Days Streak</span>
                    <Calendar size={12} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black mt-1 flex items-baseline gap-1">
                    <span className="text-white">{myStats.uniqueDays}</span>
                    <span className="text-slate-600 text-xs">/ 10 days</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${myStats.progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center justify-between">
                    <span>Correct Analysis (6 Req.)</span>
                    <CheckCircle size={12} className="text-green-500" />
                  </div>
                  <div className="text-2xl font-black mt-1 flex items-baseline gap-1">
                    <span className="text-green-400">{myStats.correctDaysCount}</span>
                    <span className="text-slate-600 text-xs">/ 6 correct</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-green-500 h-full rounded-full transition-all duration-500" style={{ width: `${myStats.correctPercent}%` }}></div>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center justify-between">
                    <span>Win Rate</span>
                    <TrendingUp size={12} className="text-azure" />
                  </div>
                  <div className="text-2xl font-black mt-1 text-azure flex items-baseline gap-1">
                    <span>{myStats.winRate}%</span>
                    <span className="text-slate-600 text-xs"> target 60%</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2.5">
                    {myStats.isEligible ? (
                      <span className="text-green-400 font-bold flex items-center gap-1">
                        <Check size={12} /> Target achieved!
                      </span>
                    ) : (
                      <span>Requires 60% + 10 distinct days</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 🌟 Display Master Mentor Congratulations if approved & badge-holder */}
      {isApprovedMentor && currentEducator?.hasMasterMentorBadge && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-amber-500/20 via-yellow-500/5 to-slate-950/20 border border-amber-500/30 p-5 rounded-3xl flex items-center gap-4 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full"></div>
          <div className="p-3.5 bg-gradient-to-br from-amber-400 to-yellow-600 rounded-2xl text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]">
            <Award size={24} className="animate-pulse" />
          </div>
          <div>
            <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              MASTER MENTOR Active Profile
            </h4>
            <p className="text-xs text-amber-200/80 leading-relaxed mt-0.5">
              Awesome job! Your portfolio has passed the verification guidelines. Your verified status is badge-marked across all your technical posts.
            </p>
          </div>
        </motion.div>
      )}

      {/* ✍️ Post Creation Box (Only for Educators/Candidates) */}
      {canPublish ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={16} className="text-azure" /> Share Technical Setup
            </h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              {currentEducator?.name || "Educator"} Profile
            </span>
          </div>

          {hasPostedToday() ? (
            <div className="p-4 bg-slate-950/80 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center py-8 space-y-2">
              <Clock className="text-amber-500" size={32} />
              <h4 className="font-bold text-white">Daily Limit Cooldown Active</h4>
              <p className="text-xs text-slate-400 max-w-md">
                To maintain high-quality setups and authentic track records, you can only publish **one analysis post per calendar day**. Come back tomorrow to place your next forecast!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Break down your setup here (e.g., 'EURUSD H4 Bullish Divergence on key Support...')" 
                className="w-full bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-white placeholder-slate-600 text-sm focus:outline-none focus:border-azure/40 transition-colors"
                rows={3}
              />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl border border-white/5 text-xs font-bold flex items-center gap-2 transition-colors">
                    <Upload size={14} />
                    {image ? 'Change Chart' : 'Upload Chart Image'}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} 
                      className="hidden" 
                    />
                  </label>
                  {image && (
                    <span className="text-xs text-green-400 font-bold flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-xl">
                      <Check size={12} /> {image.name.length > 20 ? image.name.slice(0, 20) + '...' : image.name}
                    </span>
                  )}
                </div>

                <button 
                  onClick={handleUpload} 
                  disabled={isUploading} 
                  className="px-6 py-2.5 bg-azure text-slate-950 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-azure/90 transition-colors disabled:opacity-50"
                >
                  {isUploading ? 'Uploading & Publishing...' : 'Post Analysis'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 🚫 Warn General Users and guide them to Application */
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl">
            <GraduationCap size={32} />
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                Market Analysis by Elite Mentors
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mt-1">
                To maintain the absolute highest standard of trading expertise and consistency on our panel, only verified educators and registered candidates are allowed to publish Technical Analysis posts here. You can browse, study, list setups, and vote!
              </p>
            </div>
            <button 
              onClick={() => setActiveView('educators')}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-md"
            >
              Apply as a Mentor & Take the Test
            </button>
          </div>
        </div>
      )}

      {/* 📊 Posts Forum Feed */}
      <div className="space-y-8">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Latest Technical Forecasts ({allPosts.length})
          </h2>
          <span className="text-[10px] text-slate-600 italic">Auto-cleans setups older than 30 days</span>
        </div>

        {allPosts.length === 0 ? (
          <div className="text-center py-20 bg-slate-900/20 border border-dashed border-white/5 rounded-3xl space-y-3">
            <TrendingUp size={40} className="mx-auto text-slate-600" />
            <h3 className="text-md font-bold text-slate-300">No Technical Setups Published Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">Verified mentors will publish setups soon. Stick around to review their forecasts!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allPosts.map(post => {
              const correctCount = Array.isArray(post.correctVotes) ? post.correctVotes.length : 0;
              const incorrectCount = Array.isArray(post.incorrectVotes) ? post.incorrectVotes.length : 0;
              const totalVotes = correctCount + incorrectCount;

              // Find creator's educator details
              const creatorEducator = educators.find(e => e.userId === post.userId);
              const authorName = post.authorName || creatorEducator?.name || "Verified Mentor";
              const authorAvatar = post.authorAvatar || creatorEducator?.avatar || "";
              
              // percentages
              const correctPct = totalVotes > 0 ? Math.round((correctCount / totalVotes) * 100) : 50;

              return (
                <div 
                  key={post.id} 
                  onClick={() => setSelectedPostId(post.id)}
                  className="bg-slate-900 border border-slate-800/80 rounded-3xl overflow-hidden hover:border-amber-500/30 hover:shadow-[0_8px_35px_rgba(245,158,11,0.04)] cursor-pointer transition-all flex flex-col h-full group relative"
                >
                  {/* Post Header */}
                  <div className="p-4 flex items-center justify-between border-b border-white/5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400 border border-white/10 overflow-hidden shrink-0">
                        {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" /> : authorName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-white truncate max-w-[120px]">{authorName}</span>
                          {creatorEducator?.hasMasterMentorBadge && (
                            <span className="text-[8px] bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0" title="Master Mentor">
                              🏆
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[8px] font-bold uppercase px-1 py-0.2 rounded border ${getTierBadgeStyles(creatorEducator?.tier || 'bronze')}`}>
                            {creatorEducator?.tier || 'Bronze'}
                          </span>
                          <span className="text-[9px] text-slate-500 shrink-0">
                            {new Date(post.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Delete option */}
                    {(user?.role === 'admin' || post.userId === user?.id) && (
                      <button 
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (confirm("Delete this analysis post?")) {
                            await deletePostLocallyAndOnDb(post.id);
                          }
                        }}
                        className="text-slate-600 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Post Image Container */}
                  <div className="relative aspect-video bg-slate-950/80 flex items-center justify-center border-b border-white/5 overflow-hidden shrink-0">
                    <img 
                      src={post.imageUrl} 
                      alt="Market chart analysis" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-slate-950/20 group-hover:bg-transparent transition-colors duration-300 flex items-center justify-center">
                      <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shadow-lg">
                        <Sparkles size={11} className="text-amber-400" /> View Setup
                      </span>
                    </div>
                  </div>

                  {/* Description excerpt */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed whitespace-pre-wrap">
                      {post.description}
                    </p>

                    {/* Stats row */}
                    <div className="pt-2.5 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold">
                        <span>Voturi:</span>
                        <span className="text-green-400">{correctCount} C</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-red-400">{incorrectCount} I</span>
                        {totalVotes > 0 && (
                          <span className="text-[10px] text-slate-500">({correctPct}%)</span>
                        )}
                      </div>
                      <div className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500 group-hover:text-amber-400 flex items-center gap-1">
                        <span>Open Details</span>
                        <TrendingUp size={10} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🔍 Expanded Post Modal */}
      {selectedPost && (() => {
        const post = selectedPost;
        const correctCount = Array.isArray(post.correctVotes) ? post.correctVotes.length : 0;
        const incorrectCount = Array.isArray(post.incorrectVotes) ? post.incorrectVotes.length : 0;
        const totalVotes = correctCount + incorrectCount;

        const creatorEducator = educators.find(e => e.userId === post.userId);
        const authorName = post.authorName || creatorEducator?.name || "Verified Mentor";
        const authorAvatar = post.authorAvatar || creatorEducator?.avatar || "";
        
        const correctPct = totalVotes > 0 ? Math.round((correctCount / totalVotes) * 100) : 50;
        const incorrectPct = totalVotes > 0 ? Math.round((incorrectCount / totalVotes) * 100) : 50;

        const hasVotedCorrect = Array.isArray(post.correctVotes) && post.correctVotes.includes(user?.id);
        const hasVotedIncorrect = Array.isArray(post.incorrectVotes) && post.incorrectVotes.includes(user?.id);

        return (
          <div className="fixed inset-0 z-[4000] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" 
              onClick={() => setSelectedPostId(null)}
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col text-slate-300"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-md font-bold text-slate-400 border border-white/10 overflow-hidden shrink-0">
                    {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" /> : authorName[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{authorName}</span>
                      {creatorEducator?.hasMasterMentorBadge && (
                        <span className="flex items-center gap-1 text-[9px] bg-gradient-to-r from-amber-400 through-yellow-500 to-amber-500 text-slate-950 font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-[0_0_8px_rgba(245,158,11,0.3)] shrink-0">
                          <Award size={10} /> Master Mentor
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${getTierBadgeStyles(creatorEducator?.tier || 'bronze')}`}>
                        {creatorEducator?.tier || 'Bronze'} Tier
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock size={10} /> {new Date(post.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(user?.role === 'admin' || post.userId === user?.id) && (
                    <button 
                      onClick={async () => {
                        if (confirm("Delete this analysis post?")) {
                          await deletePostLocallyAndOnDb(post.id);
                          setSelectedPostId(null);
                        }
                      }}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 p-2 rounded-xl transition-colors"
                      title="Șterge postarea"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => setSelectedPostId(null)}
                    className="text-slate-400 hover:text-white hover:bg-white/5 p-2 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Image Display */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-white/5 max-h-[500px]">
                  <img 
                    src={post.imageUrl} 
                    alt="Market chart analysis high resolution" 
                    className="w-full h-full object-contain max-h-[500px]" 
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500">Analysis Description</h4>
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                    {post.description}
                  </p>
                </div>

                {/* Voting & Rating Stats */}
                <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                    <span>Mentor Accuracy Score</span>
                    <span>{totalVotes} total votes</span>
                  </div>

                  {/* Vote Buttons Row */}
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleVote(post, 'correct')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all ${
                        hasVotedCorrect 
                          ? 'bg-green-500/15 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]' 
                          : 'bg-slate-950 border-white/5 text-slate-400 hover:border-green-500/40 hover:text-green-400'
                      }`}
                    >
                      <CheckCircle size={18} />
                      <span>Correct</span>
                      <span className="font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full text-xs">
                        {correctCount}
                      </span>
                    </button>

                    <button 
                      onClick={() => handleVote(post, 'incorrect')}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all ${
                        hasVotedIncorrect 
                          ? 'bg-red-500/15 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                          : 'bg-slate-950 border-white/5 text-slate-400 hover:border-red-500/40 hover:text-red-500'
                      }`}
                    >
                      <XCircle size={18} />
                      <span>Incorrect</span>
                      <span className="font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full text-xs">
                        {incorrectCount}
                      </span>
                    </button>
                  </div>

                  {/* Accuracy bar metric */}
                  {totalVotes > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-bold text-slate-500">
                        <span className="text-green-400">{correctPct}% Correct</span>
                        <span className="text-red-500">{incorrectPct}% Incorrect</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden flex">
                        <div className="bg-green-500 h-full rounded-l-full transition-all duration-300" style={{ width: `${correctPct}%` }}></div>
                        <div className="bg-red-500 h-full rounded-r-full transition-all duration-300" style={{ width: `${incorrectPct}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* AI Strategic Analysis Button / Drawer */}
                <div className="pt-2">
                  {!analyses[post.id] ? (
                    <button
                      disabled={analyzingPostId !== null}
                      onClick={() => analyzePostWithAI(post)}
                      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border text-xs font-bold transition-all ${
                        analyzingPostId === post.id
                          ? 'bg-slate-900 border-orange-500/20 text-orange-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-500/10 via-amber-500/15 to-orange-500/10 border-orange-500/20 text-orange-400 hover:border-orange-500/40 hover:text-orange-300 shadow-[0_0_15px_rgba(249,115,22,0.05)] active:scale-[0.98]'
                      }`}
                    >
                      {analyzingPostId === post.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                          <span>Analyzing strategy with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} className="animate-pulse text-orange-400" />
                          <span>Analyze Strategy with AI</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="bg-slate-950/60 rounded-2xl border border-orange-500/15 p-5 space-y-4 shadow-[inset_0_0_15px_rgba(249,115,22,0.02)]">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider block">
                          <Brain size={14} className="text-orange-400 inline" />
                          <span>AI Strategic Analysis Report</span>
                        </div>
                        <button
                          onClick={() => {
                            setAnalyses(prev => {
                              const updated = { ...prev };
                              delete updated[post.id];
                              return updated;
                            });
                          }}
                          className="text-slate-500 hover:text-slate-300 text-[10px] font-bold uppercase transition-colors"
                        >
                          Hide
                        </button>
                      </div>

                      {/* Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Executive Summary</span>
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">
                          {analyses[post.id].summary}
                        </p>
                      </div>

                      {/* Strategy Steps & Order */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Logical Order Planning</span>
                        <div className="grid gap-1.5">
                          {analyses[post.id].orderSteps?.map((step: string, idx: number) => (
                            <div key={idx} className="flex gap-2.5 items-start bg-white/[0.01] border border-white/5 p-2 rounded-xl">
                              <span className="w-4 h-4 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed font-sans">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Strategic evaluation */}
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Strategy Viability Evaluation</span>
                        <div className="bg-white/[0.01] border border-white/5 p-3 rounded-xl">
                          <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                            {analyses[post.id].evaluationText}
                          </p>
                        </div>
                      </div>

                      {/* Indicators list */}
                      {analyses[post.id].indicatorsAndPatterns && analyses[post.id].indicatorsAndPatterns.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Identified Technical Elements</span>
                          <div className="flex flex-wrap gap-1.5">
                            {analyses[post.id].indicatorsAndPatterns.map((it: string, idx: number) => (
                              <span key={idx} className="text-[10px] font-bold bg-slate-900 border border-white/5 text-slate-400 px-2 py-0.5 rounded-md">
                                {it}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggestions and Improvements */}
                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Suggestions & Improvements</span>
                        <ul className="space-y-1.5">
                          {analyses[post.id].innovativeIdeas?.map((idea: string, idx: number) => (
                            <li key={idx} className="flex gap-2 items-start text-xs text-slate-300 font-sans leading-relaxed">
                              <span className="text-orange-400 shrink-0 mt-1">✦</span>
                              <span>{idea}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Hedging or Alternative Setup */}
                      <div className="space-y-1 border-t border-white/5 pt-3">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Alternative Setup / Protection (Hedging)</span>
                        <p className="text-xs text-slate-400 leading-relaxed italic font-sans animate-pulse">
                          {analyses[post.id].alternativeSetup}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 🛡️ Admin Vote Panel */}
                {(user?.role === 'admin' || user?.email === 'cloudcomun@gmail.com') && (
                  <div className="p-5 bg-slate-950/80 border border-dashed border-blue-500/30 rounded-2xl space-y-3 shadow-[0_4px_20px_rgba(59,130,246,0.05)]">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider">
                      <ShieldAlert size={14} className="text-blue-400 shrink-0" />
                      <span>Panou Control Voturi Admin (Silent)</span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                      {/* Vote quantity input */}
                      <div className="w-full sm:w-36 flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                        <span className="text-[10px] text-slate-500 font-extrabold uppercase shrink-0">Cantitate:</span>
                        <input 
                          type="number"
                          min="1"
                          max="1000"
                          value={adminVoteQuantities[post.id] ?? 10}
                          onChange={(e) => {
                            const val = Math.min(1000, Math.max(1, parseInt(e.target.value) || 1));
                            setAdminVoteQuantities(prev => ({ ...prev, [post.id]: val }));
                          }}
                          className="w-full bg-transparent text-white font-black text-xs focus:outline-none"
                        />
                      </div>

                      {/* Vote actions */}
                      <div className="w-full sm:flex-1 flex gap-2">
                        <button
                          onClick={() => handleAdminVotes(post, 'correct')}
                          className="flex-1 py-2 px-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          title="Adaugă voturi corecte"
                        >
                          <span>+ Corect ({adminVoteQuantities[post.id] ?? 10})</span>
                        </button>

                        <button
                          onClick={() => handleAdminVotes(post, 'incorrect')}
                          className="flex-1 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                          title="Adaugă voturi incorecte"
                        >
                          <span>+ Incorect ({adminVoteQuantities[post.id] ?? 10})</span>
                        </button>

                        <button
                          onClick={() => handleClearAdminVotes(post)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-400 rounded-xl text-xs font-bold transition-all"
                          title="Resetează toate voturile"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        );
      })()}


      {showForumRulesModal && (
        <ForumRulesModal onClose={() => setShowForumRulesModal(false)} />
      )}
    </div>
  );
}

function ForumRulesModal({ onClose }: { onClose: () => void }) {
  const [lang, setLang] = useState<'en' | 'es' | 'fr'>(() => (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en');

  useEffect(() => {
    const handleLangChange = () => {
      const currentLang = (localStorage.getItem('market_forum_lang') as 'en' | 'es' | 'fr') || 'en';
      setLang(currentLang);
    };
    window.addEventListener('market_forum_lang_change', handleLangChange);
    return () => window.removeEventListener('market_forum_lang_change', handleLangChange);
  }, []);

  const changeLang = (newLang: 'en' | 'es' | 'fr') => {
    setLang(newLang);
    localStorage.setItem('market_forum_lang', newLang);
    window.dispatchEvent(new Event('market_forum_lang_change'));
  };

  const T = rulesTranslations[lang];

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative z-10 max-h-[90vh] flex flex-col text-slate-300 animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-blue-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-azure rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{T.Title}</h2>
              <p className="text-xs text-slate-400">{T.Subtitle_Modal}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
            {/* Language Selectors */}
            <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
              <button
                onClick={() => changeLang('en')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'en' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="English"
              >
                <span>🇬🇧</span>
                <span className="text-[9px]">EN</span>
              </button>
              <button
                onClick={() => changeLang('es')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'es' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Español"
              >
                <span>🇪🇸</span>
                <span className="text-[9px]">ES</span>
              </button>
              <button
                onClick={() => changeLang('fr')}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all flex items-center gap-1 ${lang === 'fr' ? 'bg-blue-600 text-white shadow-sm' : 'hover:bg-white/5 text-slate-400'}`}
                title="Français"
              >
                <span>🇫🇷</span>
                <span className="text-[9px]">FR</span>
              </button>
            </div>

            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-lg transition-colors text-base font-bold"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          
          {/* Rule 1: Who Can Post */}
          <div className="flex gap-4">
            <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-azure shrink-0 h-10 w-10 flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">{T.R1_Title}</h3>
              <p className="text-slate-400 text-xs">
                {T.R1_Desc}
              </p>
            </div>
          </div>

          {/* Rule 2: Anti-Spam Control */}
          <div className="flex gap-4">
            <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-amber-400 shrink-0 h-10 w-10 flex items-center justify-center">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">{T.R2_Title}</h3>
              <p className="text-slate-400 text-xs">
                {T.R2_Desc}
              </p>
            </div>
          </div>

          {/* Rule 3: Community Votes */}
          <div className="flex gap-4">
            <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-green-400 shrink-0 h-10 w-10 flex items-center justify-center">
              <ThumbsUp size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">{T.R3_Title}</h3>
              <p className="text-slate-400 text-xs">
                {T.R3_Desc}
              </p>
            </div>
          </div>

          {/* Rule 4: Master Mentor Challenge */}
          <div className="flex gap-4">
            <div className="p-2 bg-slate-800 border border-white/5 rounded-xl text-purple-400 shrink-0 h-10 w-10 flex items-center justify-center">
              <Award size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm mb-1">{T.R4_Title}</h3>
              <p className="text-slate-400 text-xs">
                {T.R4_Desc}
              </p>
            </div>
          </div>

          {/* Rule 5: Strict Conduct Warning */}
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
            <ShieldAlert className="text-red-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h4 className="font-bold text-red-400 text-xs uppercase tracking-wider mb-1">{T.R5_Title}</h4>
              <p className="text-[11px] text-slate-400 leading-normal">
                {T.R5_Desc}
              </p>
            </div>
          </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-950/40 border-t border-white/5 flex justify-end">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-xs"
          >
            {T.Btn_Close}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
