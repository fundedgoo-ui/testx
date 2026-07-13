import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TrendingUp } from 'lucide-react';

const NAMES = [
  "John Smith", "Maria Garcia", "Wei Chen", "Ivan Petrov", "Sarah Jones", "Yuki Tanaka",
  "Hans Müller", "Elena Rossi", "Liam O'Connor", "Aisha Khan", "Pierre Dubois", "Sofia Silva",
  "Hiroshi Sato", "Dmitry Sokolov", "Chloe Lefebvre", "Ahmed Hassan", "Fatima Zahra", "James Wilson",
  "Emma Brown", "Michael Taylor", "Olivia Miller", "Robert Anderson", "Ava Thomas", "William Jackson",
  "Sophia White", "David Harris", "Isabella Martin", "Richard Thompson", "Mia Garcia", "Joseph Martinez",
  "Charlotte Robinson", "Thomas Clark", "Amelia Rodriguez", "Charles Lewis", "Evelyn Lee", "Christopher Walker",
  "Abigail Hall", "Daniel Allen", "Harper Young", "Matthew Hernandez", "Emily King", "Anthony Wright",
  "Elizabeth Lopez", "Mark Hill", "Sofia Scott", "Donald Green", "Evelyn Adams", "Paul Baker",
  "Grace Gonzalez", "Steven Nelson", "Chloe Carter", "Andrew Mitchell", "Victoria Perez", "Kenneth Roberts",
  "Elena Turner", "Joshua Phillips", "Penelope Campbell", "Kevin Parker", "Layla Evans", "Brian Edwards",
  "Nora Collins", "Jason Stewart", "Audrey Sanchez", "Eric Morris", "Zoey Rogers", "Ryan Reed",
  "Stella Cook", "Thomas Morgan", "Lily Bell", "Jacob Murphy", "Hannah Bailey", "Gary Rivera",
  "Violet Cooper", "Nicholas Richardson", "Aurora Cox", "Jonathan Howard", "Savannah Ward", "Larry Torres",
  "Hazel Peterson", "Gregory Gray", "Bella Ramirez", "Frank James", "Natalie Watson", "Scott Brooks",
  "Lucy Kelly", "Benjamin Sanders", "Audrey Price", "Samuel Bennett", "Ruby Wood", "Patrick Barnes",
  "Skylar Ross", "Alexander Henderson", "Paisley Coleman", "Jack Jenkins", "Emery Perry", "Tyler Powell",
  "Maya Long", "Aaron Patterson", "Piper Hughes"
];

const generateAction = (): string => {
  const types = ["pro", "payout", "eval", "std"];
  const type = types[Math.floor(Math.random() * types.length)];
  
  switch(type) {
    case "pro": return "purchased a PRO account";
    case "payout": 
      const amount = Math.floor(Math.random() * (28000 - 100 + 1)) + 100;
      return `made a payout of $${amount.toLocaleString()}`;
    case "eval": return "passed the evaluation";
    case "std": return "purchased a STANDARD account";
    default: return "made a transaction";
  }
};

export default function SocialProofToast() {
  const [toast, setToast] = useState<{name: string, action: string} | null>(null);

  useEffect(() => {
    // Ruleaza la un interval random intre 30 si 60 de secunde
    const interval = setInterval(() => {
      const name = NAMES[Math.floor(Math.random() * NAMES.length)];
      const action = generateAction();
      
      setToast({ name, action });
      
      // Notificarea dispare dupa 5 secunde
      setTimeout(() => setToast(null), 5000);
      
    }, 30000 + Math.random() * 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 left-6 z-[9999] bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl flex items-center gap-3 max-w-[280px]"
        >
          <div className="bg-azure/20 p-2 rounded-lg text-azure">
            <TrendingUp size={16}/>
          </div>
          <div>
            <p className="text-sm text-white font-bold">{toast.name}</p>
            <p className="text-xs text-slate-400">{toast.action}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
