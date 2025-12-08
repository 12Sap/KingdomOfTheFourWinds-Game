import React, { useState, useEffect, useRef } from 'react';
import { 
  Sword, Shield, Handshake, Store, Hammer, Eye, 
  Crown, Coins, Package, Scroll, RefreshCw, Trophy,
  Activity, TrendingUp, Skull, Zap
} from 'lucide-react';

// --- Game Configuration ---

const ACTIONS = [
  { id: 1, name: 'Mobilize', icon: Sword, desc: 'Prepare your forces for war.', cost: { M: 2 }, result: { I: 2 }, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { id: 2, name: 'Raid', icon: Shield, desc: 'Pillage neighboring lands.', cost: {}, result: { M: 4, I: -1 }, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  { id: 3, name: 'Diplomacy', icon: Handshake, desc: 'Win hearts and minds.', cost: { M: 1 }, result: { I: 3 }, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  { id: 4, name: 'Trade', icon: Store, desc: 'Open markets for goods.', cost: { I: 1 }, result: { M: 3, G: 1 }, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 5, name: 'Build', icon: Hammer, desc: 'Invest in infrastructure.', cost: { M: 4 }, result: { G: 4 }, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  { id: 6, name: 'Espionage', icon: Eye, desc: 'Steal secrets & influence.', cost: { G: 1 }, result: { I: 2 }, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 7, name: 'Alliance', icon: Crown, desc: 'Form a strategic bond.', cost: {}, result: { alliance: true }, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30' }
];

const KINGDOM_NAMES = ['Northrealm', 'Duskfall', 'Eastwind', 'Southmarch'];
const COLORS = ['text-cyan-400', 'text-purple-400', 'text-amber-400', 'text-rose-400'];

// --- Utility Components ---

const StatBadge = ({ icon: Icon, value, color, label }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/50 border border-slate-700/50 shadow-sm ${color}`}>
    <Icon size={16} />
    <span className="font-bold font-mono">{value}</span>
    {label && <span className="text-xs text-slate-500 uppercase tracking-wider hidden sm:inline">{label}</span>}
  </div>
);

const ProgressBar = ({ value, max, colorClass }) => (
  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mt-1">
    <div 
      className={`h-full transition-all duration-500 ease-out ${colorClass}`} 
      style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
    />
  </div>
);

// --- Main App Component ---

export default function App() {
  // Game State
  const [turn, setTurn] = useState(1);
  const [kingdoms, setKingdoms] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);

  // Refs for auto-scrolling log
  const logEndRef = useRef(null);

  // --- Initialization ---

  const initGame = () => {
    const initialKingdoms = KINGDOM_NAMES.map((n, i) => ({
      id: i,
      name: n,
      color: COLORS[i],
      M: 8 + (i * 2), // Money
      I: 5,           // Influence
      G: 6,           // Goods
      alliances: [],
      incomeBuff: { M: 0, I: 0, G: 0 },
      isPlayer: i === 0
    }));
    setKingdoms(initialKingdoms);
    setTurn(1);
    setLogs([{ turn: 1, text: "The Age of Four Winds begins. Choose your path wisely.", type: 'system' }]);
    setFloatingTexts([]);
    setIsProcessing(false);
  };

  useEffect(() => {
    initGame();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Logic Helpers ---

  const addLog = (text, type = 'info') => {
    setLogs(prev => [...prev, { turn, text, type, id: Date.now() + Math.random() }]);
  };

  const addFloatingText = (text, color, delay = 0) => {
    const id = Date.now() + Math.random();
    setTimeout(() => {
      setFloatingTexts(prev => [...prev, { id, text, color }]);
      // Auto remove after animation
      setTimeout(() => {
        setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
      }, 1500);
    }, delay);
  };

  const canPay = (k, cost) => {
    if (!cost) return true;
    for (const key in cost) {
      if ((k[key] || 0) < cost[key]) return false;
    }
    return true;
  };

  // --- Core Game Loop ---

  const executeAction = async (kingdomId, action) => {
    setKingdoms(prev => {
      const newKingdoms = [...prev];
      const k = { ...newKingdoms[kingdomId] };

      // Pay Costs
      if (action.cost) {
        Object.keys(action.cost).forEach(key => {
          const val = action.cost[key];
          k[key] -= val;
          if (k.isPlayer) addFloatingText(`-${val} ${key}`, 'text-red-500');
        });
      }

      // Handle Alliance Special Case
      if (action.result.alliance) {
        const others = newKingdoms.filter(o => o.id !== k.id);
        const partner = others[Math.floor(Math.random() * others.length)];
        
        // 50% chance
        if (Math.random() > 0.5) {
          k.incomeBuff.M += 3;
          k.incomeBuff.I += 1;
          k.incomeBuff.G += 2;
          k.alliances.push(partner.name);
          addLog(`${k.name} formed an alliance with ${partner.name}!`, k.isPlayer ? 'success' : 'info');
          
          // Partner gets buff too (simplified direct mutation for partner to avoid complex state finding)
          partner.incomeBuff.M += 2;
          partner.incomeBuff.I += 1;
          partner.incomeBuff.G += 1;
          if (k.isPlayer) addFloatingText("Alliance Formed!", "text-yellow-400");
        } else {
          k.I = Math.max(0, k.I - 3);
          addLog(`${k.name} alliance failed. Lost 3 Influence.`, 'error');
          if (k.isPlayer) addFloatingText("-3 Infl (Failed)", "text-red-500");
        }
      } else {
        // Standard Action
        Object.keys(action.result).forEach(key => {
          const val = action.result[key];
          k[key] += val;
          if (k.isPlayer) {
             const color = val > 0 ? 'text-green-400' : 'text-red-400';
             addFloatingText(`${val > 0 ? '+' : ''}${val} ${key}`, color);
          }
        });
        addLog(`${k.name} used ${action.name}.`, k.isPlayer ? 'player' : 'enemy');
      }

      newKingdoms[kingdomId] = k;
      return newKingdoms;
    });
  };

  const handlePlayerAction = async (actionId) => {
    if (isProcessing) return;
    const action = ACTIONS.find(a => a.id === actionId);
    const player = kingdoms[0];

    if (!canPay(player, action.cost)) {
      addFloatingText("Insufficient Funds", "text-red-500");
      return;
    }

    setIsProcessing(true);
    setSelectedAction(actionId);

    // 1. Player Turn
    await executeAction(0, action);
    
    // 2. AI Turns (Simulated delay)
    const aiKingdoms = kingdoms.slice(1);
    
    // Process AI sequentially with delay for visual "thinking"
    for (let i = 0; i < aiKingdoms.length; i++) {
      await new Promise(r => setTimeout(r, 600)); // Delay between turns
      const aiK = aiKingdoms[i];
      
      // Simple AI: Random affordable action
      const affordableActions = ACTIONS.filter(a => canPay(aiK, a.cost));
      const aiAction = affordableActions[Math.floor(Math.random() * affordableActions.length)];
      
      if (aiAction) {
        await executeAction(aiK.id, aiAction);
      } else {
        addLog(`${aiK.name} waits (No resources).`, 'info');
      }
    }

    // 3. End Turn Income
    await new Promise(r => setTimeout(r, 500));
    setKingdoms(prev => prev.map(k => {
      if (k.incomeBuff.M || k.incomeBuff.I || k.incomeBuff.G) {
        if (k.isPlayer) {
            if(k.incomeBuff.M) addFloatingText(`+${k.incomeBuff.M} Money`, 'text-yellow-500', 100);
            if(k.incomeBuff.I) addFloatingText(`+${k.incomeBuff.I} Infl`, 'text-cyan-500', 300);
            if(k.incomeBuff.G) addFloatingText(`+${k.incomeBuff.G} Goods`, 'text-emerald-500', 500);
        }
        return {
          ...k,
          M: Math.max(0, k.M + k.incomeBuff.M),
          I: Math.max(0, k.I + k.incomeBuff.I),
          G: Math.max(0, k.G + k.incomeBuff.G),
        };
      }
      return k;
    }));
    
    setTurn(t => t + 1);
    setIsProcessing(false);
    setSelectedAction(null);
  };

  const player = kingdoms[0] || {};
  
  // Calculate rankings
  const rankedKingdoms = [...kingdoms].sort((a,b) => (b.M + b.I + b.G) - (a.M + a.I + a.G));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black z-0" />
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}} />

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-slate-950 font-black text-xl">KW</div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Kingdom of Four Winds</h1>
              <p className="text-sm text-slate-400">Strategize. Negotiate. Conquer.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="px-4 py-2 bg-slate-900 rounded-xl border border-white/5 text-sm font-medium text-slate-400">
               Turn <span className="text-cyan-400 text-lg font-bold ml-1">{turn}</span>
             </div>
             <button 
               onClick={initGame}
               className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
               title="Restart Game"
             >
               <RefreshCw size={18} />
             </button>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Player Status & Actions (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Player Dashboard */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 border border-white/10 p-6 backdrop-blur-sm shadow-xl">
              {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-cyan-500/20 blur-3xl rounded-full" />
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                    🏰
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{player.name} <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 ml-2">YOU</span></h2>
                    <div className="text-sm text-slate-400 mt-1 flex gap-2">
                       {player.alliances?.length > 0 ? (
                         <span className="flex items-center text-emerald-400"><Handshake size={14} className="mr-1"/> Allied: {player.alliances.join(', ')}</span>
                       ) : (
                         <span>No active alliances</span>
                       )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <StatBadge icon={Coins} value={player.M} label="Gold" color="text-amber-400" />
                  <StatBadge icon={Crown} value={player.I} label="Influence" color="text-cyan-400" />
                  <StatBadge icon={Package} value={player.G} label="Goods" color="text-emerald-400" />
                </div>
              </div>

              {/* Buffs Indicator */}
              {(player.incomeBuff?.M > 0 || player.incomeBuff?.I > 0 || player.incomeBuff?.G > 0) && (
                <div className="mt-6 pt-4 border-t border-white/5 flex gap-4 text-xs font-mono text-slate-400">
                  <span className="uppercase tracking-widest text-slate-500">Passive Income:</span>
                  {player.incomeBuff.M > 0 && <span className="text-amber-400">+{player.incomeBuff.M}G/turn</span>}
                  {player.incomeBuff.I > 0 && <span className="text-cyan-400">+{player.incomeBuff.I}I/turn</span>}
                  {player.incomeBuff.G > 0 && <span className="text-emerald-400">+{player.incomeBuff.G}G/turn</span>}
                </div>
              )}

              {/* Floating Text Overlay */}
              {floatingTexts.map(ft => (
                <div 
                  key={ft.id}
                  className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none font-bold text-xl animate-float-up ${ft.color}`}
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
                >
                  {ft.text}
                </div>
              ))}
            </div>

            {/* Action Grid */}
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Activity size={16} /> Command Center
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {ACTIONS.map((action) => {
                  const affordable = canPay(player, action.cost);
                  const isSelected = selectedAction === action.id;
                  
                  return (
                    <button
                      key={action.id}
                      onClick={() => handlePlayerAction(action.id)}
                      disabled={isProcessing || !affordable}
                      className={`
                        relative group flex flex-col items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left h-full
                        ${isSelected ? 'ring-2 ring-cyan-400 scale-95' : ''}
                        ${affordable && !isProcessing 
                          ? `bg-slate-800/40 hover:bg-slate-800 border-white/5 hover:border-white/20 hover:-translate-y-1 cursor-pointer` 
                          : `opacity-50 grayscale cursor-not-allowed bg-slate-900 border-transparent`}
                      `}
                    >
                      <div className={`p-3 rounded-full mb-3 ${action.bg} ${action.color}`}>
                        <action.icon size={24} />
                      </div>
                      <div className="w-full text-center">
                        <div className="font-bold text-slate-200 text-sm mb-1">{action.name}</div>
                        <div className="text-xs text-slate-500 leading-tight mb-3 h-8">{action.desc}</div>
                      </div>
                      
                      {/* Cost/Gain Mini-badges */}
                      <div className="w-full pt-3 border-t border-white/5 flex justify-between items-center text-xs font-mono">
                         <div className="text-red-400 font-semibold">
                           {action.cost.M ? `-${action.cost.M}M ` : ''}
                           {action.cost.I ? `-${action.cost.I}I ` : ''}
                           {action.cost.G ? `-${action.cost.G}G ` : ''}
                           {!Object.keys(action.cost).length && <span className="text-slate-600">Free</span>}
                         </div>
                         <div className="text-emerald-400 font-semibold">
                           {action.result.M ? `+${action.result.M}M` : ''}
                           {action.result.I ? `+${action.result.I}I` : ''}
                           {action.result.G ? `+${action.result.G}G` : ''}
                           {action.result.alliance && '?'}
                         </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Event Log */}
            <div className="flex-1 min-h-[200px] bg-slate-950 rounded-xl border border-white/10 p-4 font-mono text-sm relative overflow-hidden flex flex-col">
              <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none z-10" />
              <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-2">
                 {logs.length === 0 && <div className="text-slate-600 italic text-center mt-10"> Chronicles are empty...</div>}
                 {logs.map((log) => (
                   <div key={log.id} className={`
                     p-2 rounded border-l-2 text-xs md:text-sm animate-fade-in
                     ${log.type === 'player' ? 'border-cyan-500 bg-cyan-950/20 text-cyan-100' : ''}
                     ${log.type === 'enemy' ? 'border-orange-500/50 bg-orange-950/10 text-orange-200/80' : ''}
                     ${log.type === 'success' ? 'border-emerald-500 bg-emerald-950/20 text-emerald-100' : ''}
                     ${log.type === 'error' ? 'border-red-500 bg-red-950/20 text-red-100' : ''}
                     ${log.type === 'system' ? 'border-slate-500 bg-slate-900 text-slate-400 italic' : ''}
                   `}>
                     <span className="opacity-50 mr-2">T{log.turn}</span>
                     {log.text}
                   </div>
                 ))}
                 <div ref={logEndRef} />
              </div>
            </div>

          </div>

          {/* Right Column: Rival Kingdoms (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-5 backdrop-blur-sm h-full">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Trophy size={16} className="text-yellow-500"/> Power Ranking</span>
                <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-500">Live Updates</span>
              </h3>
              
              <div className="space-y-4">
                {rankedKingdoms.map((k, idx) => (
                  <div key={k.id} className={`
                    relative p-4 rounded-xl border transition-all duration-300
                    ${k.isPlayer ? 'bg-gradient-to-r from-cyan-900/20 to-slate-800 border-cyan-500/30 ring-1 ring-cyan-500/20' : 'bg-slate-800/50 border-white/5'}
                  `}>
                    <div className="flex justify-between items-center mb-2">
                       <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold w-5 h-5 flex items-center justify-center rounded bg-slate-950 text-slate-500 font-mono`}>{idx + 1}</span>
                          <span className={`font-bold ${k.color}`}>{k.name}</span>
                          {k.isPlayer && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/>}
                       </div>
                       <div className="text-xs text-slate-500 font-mono">Score: {k.M + k.I + k.G}</div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-4 text-center">M</div>
                        <ProgressBar value={k.M} max={40} colorClass="bg-amber-400" />
                        <div className="w-6 text-right font-mono">{k.M}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-4 text-center">I</div>
                        <ProgressBar value={k.I} max={20} colorClass="bg-cyan-400" />
                        <div className="w-6 text-right font-mono">{k.I}</div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <div className="w-4 text-center">G</div>
                        <ProgressBar value={k.G} max={30} colorClass="bg-emerald-400" />
                        <div className="w-6 text-right font-mono">{k.G}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips Card */}
              <div className="mt-6 p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/20 text-xs text-indigo-200">
                <div className="font-bold flex items-center gap-2 mb-2"><Zap size={14}/> Strategy Tip</div>
                Alliances provide passive income every turn, but failing the negotiation costs significant Influence. High Risk, High Reward.
              </div>

            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @keyframes float-up {
          0% { transform: translate(-50%, -50%); opacity: 1; }
          100% { transform: translate(-50%, -150%); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }
        @keyframes fade-in {
            from { opacity: 0; transform: translateX(-5px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in {
            animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}