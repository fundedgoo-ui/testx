import React, { useState, useEffect } from 'react';
import { db, auth, storage } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Upload, Heart, MessageCircle, Send, X } from 'lucide-react';

export default function MarketAnalysisView() {
  const [posts, setPosts] = useState<any[]>([]);
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const handleUpload = async () => {
    if (!image || !auth.currentUser) return;
    setIsUploading(true);
    
    // Check 1 post per day
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const q = query(collection(db, 'posts'), where('userId', '==', auth.currentUser.uid), where('createdAt', '>', twentyFourHoursAgo));
    const recentPosts = await getDocs(q);
    if (!recentPosts.empty) {
      alert("You can only post once per day.");
      setIsUploading(false);
      return;
    }

    // const storage = getStorage(); // REMOVED
    const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}`);
    await uploadBytes(storageRef, image);
    const imageUrl = await getDownloadURL(storageRef);
    
    await addDoc(collection(db, 'posts'), {
      userId: auth.currentUser.uid,
      imageUrl,
      description,
      createdAt: Date.now()
    });
    
    setIsUploading(false);
    setDescription('');
    setImage(null);
  };

  return (
    <div className="p-8 space-y-8 text-white">
      <h2 className="text-3xl font-bold">Market Analysis</h2>
      
      <div className="glass p-6 rounded-3xl space-y-4">
        <textarea 
          value={description} 
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Share your analysis..." 
          className="w-full bg-transparent border-b border-white/10 p-2 focus:outline-none"
        />
        <input type="file" onChange={(e) => setImage(e.target.files ? e.target.files[0] : null)} />
        <button onClick={handleUpload} disabled={isUploading} className="px-4 py-2 bg-azure rounded-xl">
          {isUploading ? 'Uploading...' : 'Post'}
        </button>
      </div>

      <div className="space-y-6">
        {posts.map(post => (
          <div key={post.id} className="glass p-6 rounded-3xl space-y-4">
            <img src={post.imageUrl} alt="Analysis" className="rounded-xl w-full" />
            <p>{post.description}</p>
            <div className="flex gap-4">
              <button><Heart /></button>
              <button><MessageCircle /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
