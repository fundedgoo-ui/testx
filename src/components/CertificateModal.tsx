import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Printer, Download, Award, ShieldCheck, Star } from 'lucide-react';
import { TradingAccount, Certificate } from '../types';
import { useApp } from '../AppContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CertificateModalProps {
  account: TradingAccount;
  certificate?: Certificate;
  onClose: () => void;
}

export default function CertificateModal({ account, certificate, onClose }: CertificateModalProps) {
  const { user } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);

  const userName = user?.name || user?.email?.split('@')[0] || "ELITE TRADER";
  const dateToUse = certificate ? certificate.createdAt : (account.createdAt || Date.now());
  const dateStr = new Date(dateToUse).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const signerName = certificate?.signerName || "M. Michael";

  // Determine stage and credentials
  let stageTitle = "EVALUATION PROTOCOL";
  let stageDesc = "For demonstrating steady performance, flawless risk management, and strict consistency in our challenge.";
  let badgeLabel = "PHASE 1";
  
  const typeToUse = certificate ? certificate.type : null;

  if (typeToUse === 'phase1' || (!typeToUse && account.type === 'evaluation-2')) {
    stageTitle = "PHASE 1 PASSED";
    stageDesc = "Successfully passed Phase 1 of the Evaluation Protocol, exhibiting top-tier risk defense and strategic trading consistency.";
    badgeLabel = "PHASE 1 PASSED";
  } else if (typeToUse === 'phase2' || (!typeToUse && account.status === 'pending')) {
    stageTitle = "EVALUATION GRADUATE";
    stageDesc = "Successfully completed the multi-phase evaluation, proving to be a consistent asset manager ready for Funded Capital.";
    badgeLabel = "EVALUATION PASSED";
  } else if (typeToUse === 'funded' || (!typeToUse && account.type === 'funded')) {
    stageTitle = "CERTIFIED FUNDED TRADER";
    stageDesc = "Certified Live Funded Partner, having demonstrated exceptional market mastery, meticulous risk control, and flawless consistency.";
    badgeLabel = "LIVE FUNDED";
  } else {
    // Preview / active default
    stageTitle = "ELITE TRADER EVALUATION";
    stageDesc = "Recognized candidate in pursuit of consistent trading excellence, high-performance execution, and disciplined drawdown defense.";
    badgeLabel = "PRACTICE STAGE";
  }

  const handlePrint = async () => {
    const element = document.getElementById('printable-diploma');
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#04060b',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const yPos = (pdf.internal.pageSize.getHeight() - pdfHeight) / 2;
      
      pdf.addImage(imgData, 'PNG', 0, yPos, pdfWidth, pdfHeight);
      pdf.save(`FundedGoo-Certificate-${account.accountNumber}.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Could not download PDF. If you are in preview mode, please open the app in a new tab (top right icon). Fallback to print dialog...');
      // Fallback to browser print if generation fails
      try {
        window.print(); 
      } catch (printErr: any) {
        console.error('Print failed:', printErr);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md overflow-y-auto p-4 sm:p-6 md:p-10">
      {/* Background ambient gold lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px]" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[150px]" />
      </div>

      <div className="relative w-full max-w-5xl mx-auto bg-slate-900 border border-white/10 rounded-[40px] shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col z-10 my-8">
        {/* Modal Controls Bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-slate-950/40 relative z-20 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              Official Certificate • FundedGoo Protocol
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-xl font-bold uppercase tracking-widest text-[10px] sm:text-xs transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2 shadow-[0_4px_15px_rgba(245,158,11,0.2)] disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> {isGenerating ? 'Generating PDF...' : 'Print / Save PDF'}
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Printable Body Container */}
        <div className="p-4 sm:p-8 md:p-12 bg-slate-900 overflow-x-auto min-h-[550px] flex items-center justify-center">
          {/* Main Paper Frame */}
          <div 
            id="printable-diploma"
            className="relative w-full min-w-[760px] aspect-[1.414/1] bg-gradient-to-b from-[#0b0f19] via-[#090b11] to-[#04060b] text-[#ffffff] p-12 sm:p-16 flex flex-col justify-between border-[16px] border-[#020617] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
            style={{
              backgroundImage: 'radial-gradient(circle at center, rgba(236,195,92,0.03) 0%, transparent 70%)'
            }}
          >
            {/* Trading Charts Transparent Background SVG */}
            <div className="absolute inset-0 pointer-events-none opacity-5">
              <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="none">
                {/* Grid lines */}
                <path d="M0,100 L800,100 M0,200 L800,200 M0,300 L800,300 M0,400 L800,400 M0,500 L800,500" stroke="#FFF" strokeWidth="0.5" strokeDasharray="5,5" />
                <path d="M100,0 L100,600 M200,0 L200,600 M300,0 L300,600 M400,0 L400,600 M500,0 L500,600 M600,0 L600,600 M700,0 L700,600" stroke="#FFF" strokeWidth="0.5" strokeDasharray="5,5" />
                
                {/* Candlesticks */}
                {/* Green candlesticks (Up) */}
                <g stroke="#10b981" fill="#10b981" strokeWidth="2">
                  <path d="M 50 450 L 50 350 M 45 420 L 55 420 L 55 380 L 45 380 Z" />
                  <path d="M 150 400 L 150 250 M 145 360 L 155 360 L 155 280 L 145 280 Z" />
                  <path d="M 250 300 L 250 180 M 245 260 L 255 260 L 255 200 L 245 200 Z" />
                  <path d="M 450 320 L 450 150 M 445 280 L 455 280 L 455 180 L 445 180 Z" />
                  <path d="M 650 250 L 650 80 M 645 200 L 655 200 L 655 120 L 645 120 Z" />
                </g>
                {/* Red candlesticks (Down) */}
                <g stroke="#ef4444" fill="#ef4444" strokeWidth="2">
                  <path d="M 100 360 L 100 480 M 95 380 L 105 380 L 105 450 L 95 450 Z" />
                  <path d="M 200 280 L 200 400 M 195 300 L 205 300 L 205 370 L 195 370 Z" />
                  <path d="M 350 200 L 350 350 M 345 220 L 355 220 L 355 320 L 345 320 Z" />
                  <path d="M 550 160 L 550 300 M 545 180 L 555 180 L 555 270 L 545 270 Z" />
                  <path d="M 750 100 L 750 220 M 745 120 L 755 120 L 755 190 L 745 190 Z" />
                </g>

                {/* Line Chart / Moving Average Overlay */}
                <path d="M 0 500 Q 100 420 200 380 T 400 250 T 600 200 T 800 50" fill="none" stroke="#ECC35C" strokeWidth="3" />
                <path d="M 0 550 Q 150 480 300 300 T 500 350 T 700 150 T 800 100" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="10,5" />
              </svg>
            </div>

            {/* Intricate Gold Metallic Framing Linework & Corner Decorations */}
            <div className="absolute inset-5 border border-[#ECC35C]/30 opacity-70 pointer-events-none" />
            <div className="absolute inset-6 border-[2px] border-[#FFF1C5]/40 opacity-80 pointer-events-none" />
            <div className="absolute inset-8 border border-[#9E731F]/30 opacity-60 pointer-events-none" />

            {/* Corner Bracket Ornaments SVG */}
            <div className="absolute top-8 left-8 w-12 h-12 text-[#ECC35C]/80 pointer-events-none">
              <svg viewBox="0 0 50 50" fill="none" className="w-full h-full stroke-current" strokeWidth="2">
                <path d="M 0 50 L 0 0 L 50 0" />
                <path d="M 4 46 L 4 4 L 46 4" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute top-8 right-8 w-12 h-12 text-[#ECC35C]/80 rotate-90 pointer-events-none">
              <svg viewBox="0 0 50 50" fill="none" className="w-full h-full stroke-current" strokeWidth="2">
                <path d="M 0 50 L 0 0 L 50 0" />
                <path d="M 4 46 L 4 4 L 46 4" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute bottom-8 left-8 w-12 h-12 text-[#ECC35C]/80 -rotate-90 pointer-events-none">
              <svg viewBox="0 0 50 50" fill="none" className="w-full h-full stroke-current" strokeWidth="2">
                <path d="M 0 50 L 0 0 L 50 0" />
                <path d="M 4 46 L 4 4 L 46 4" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>
            <div className="absolute bottom-8 right-8 w-12 h-12 text-[#ECC35C]/80 rotate-180 pointer-events-none">
              <svg viewBox="0 0 50 50" fill="none" className="w-full h-full stroke-current" strokeWidth="2">
                <path d="M 0 50 L 0 0 L 50 0" />
                <path d="M 4 46 L 4 4 L 46 4" strokeWidth="1" opacity="0.5" />
              </svg>
            </div>

            {/* Content Header: Logo & Subtitle */}
            <div className="text-center space-y-3 relative z-10">
              <div className="flex items-center justify-center gap-1.5 select-none">
                <span className="font-sans font-black tracking-widest text-2xl flex items-center leading-none">
                  <span className="bg-gradient-to-b from-[#FFF1C5] via-[#ECC35C] to-[#9E731F] bg-clip-text text-transparent drop-shadow-md">
                    FUNDED
                  </span>
                  <span className="bg-gradient-to-b from-[#D4F7FF] via-[#00D4FF] to-[#0055FF] bg-clip-text text-transparent ml-1">
                    GOO
                  </span>
                </span>
                <span className="text-[10px] text-[#64748b] font-mono tracking-widest border-l border-[#ffffff]/20 pl-2 ml-1">
                  ELITE EVALUATION
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#ECC35C]/40" />
                <span className="text-[10px] font-bold text-[#ECC35C] uppercase tracking-[0.3em] font-mono">
                  Certificate of Achievement
                </span>
                <div className="h-[1px] w-12 bg-gradient-to-r from-[#ECC35C]/40 to-transparent" />
              </div>
            </div>

            {/* Main Certificate Title */}
            <div className="text-center space-y-4 my-4 relative z-10">
              <h1 className="text-3xl sm:text-4xl font-display font-medium text-[#ffffff] tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                <span className="bg-gradient-to-b from-[#FFF1C5] via-[#ECC35C] to-[#C49221] bg-clip-text text-transparent">
                  {stageTitle}
                </span>
              </h1>
              
              <div className="space-y-1">
                <p className="text-[#94a3b8] text-xs tracking-wider italic">
                  Proudly awarded for outstanding performance to
                </p>
                <div className="h-[2px] w-48 bg-gradient-to-r from-transparent via-[#ECC35C]/50 to-transparent mx-auto mt-2" />
              </div>

              {/* Recipient Noble Name */}
              <div className="py-2">
                <h2 className="text-4xl sm:text-5xl font-serif tracking-wide text-transparent bg-clip-text bg-gradient-to-b from-[#ffffff] via-[#e2e8f0] to-[#94a3b8] font-bold italic py-1 filter drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                  {userName}
                </h2>
              </div>

              {/* Explanation of Merit */}
              <p className="text-[#cbd5e1] text-xs max-w-xl mx-auto leading-relaxed px-4">
                {stageDesc}
              </p>
            </div>

            {/* Footer Row: Metadata table, Golden Wax Seal, Signatures */}
            <div className="grid grid-cols-3 items-center pt-4 border-t border-[#ffffff]/10 relative z-10">
              
              {/* Credentials specifications (Left Column) */}
              <div className="space-y-2 text-left pr-4">
                <div className="border-l-2 border-[#ECC35C] pl-3 space-y-1">
                  <div className="text-[9px] text-[#ECC35C] uppercase tracking-widest font-mono font-bold">
                    Trading Account
                  </div>
                  <div className="text-[#ffffff] font-mono text-xs font-semibold">
                    Acct #{account.accountNumber}
                  </div>
                  <div className="text-[#94a3b8] font-mono text-[10px]">
                    Platform: {account.platform}
                  </div>
                  <div className="text-[#94a3b8] font-mono text-[10px]">
                    Leverage: {account.leverage || '1:100'}
                  </div>
                </div>
              </div>

              {/* 3D Gold Custom Wax Seal (Middle Column) */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative group">
                  {/* Wax Seal Outer Shiny Rings */}
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#FFF1C5] via-[#ECC35C] to-[#9E731F] shadow-[0_4px_25px_rgba(158,115,31,0.4)] flex items-center justify-center p-0.5 border border-[#FFF1C5]/30">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#9E731F] via-[#ECC35C] to-[#FFF1C5] flex flex-col items-center justify-center text-center p-1 border border-[#0f172a]/40 shadow-inner">
                      
                      {/* Innermost seal branding */}
                      <div className="w-full h-full rounded-full bg-[#020617]/20 border border-[#FFF1C5]/40 flex flex-col items-center justify-center p-0.5">
                        <Star className="w-2 h-2 text-[#ffffff] fill-[#ffffff] mb-0.5 animate-pulse" />
                        <span className="text-[7.5px] font-bold font-mono tracking-widest text-[#ffffff] leading-none scale-[0.9]">
                          ELITE
                        </span>
                        <span className="text-[6.5px] font-mono text-[#FFF1C5] leading-none tracking-widest scale-[0.8] mt-0.5">
                          TRADER
                        </span>
                      </div>

                    </div>
                  </div>
                  {/* Wax Seal Ribbon Hanging Down */}
                  <div className="absolute top-18 left-1/2 -translate-x-1/2 w-4 h-6 flex justify-between pointer-events-none opacity-80">
                    <div className="w-1.5 h-full bg-[#9E731F]/70 skew-x-12" />
                    <div className="w-1.5 h-full bg-[#ECC35C]/70 -skew-x-12" />
                  </div>
                </div>
                <span className="text-[8.5px] font-mono font-bold text-[#ECC35C] tracking-widest uppercase mt-4">
                  {badgeLabel}
                </span>
              </div>

              {/* Digital Master Signature (Right Column) */}
              <div className="space-y-2 text-right pl-4 flex flex-col items-end">
                <div className="relative w-36 h-12 flex items-center justify-center mr-2">
                  {/* Decorative Hand-Drawn Cursive Signature Stroke SVG */}
                  <svg viewBox="0 0 150 50" className="absolute inset-0 w-full h-full text-[#bae6fd] opacity-85 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    <path
                      d="M 15 35 Q 30 15 50 20 T 90 25 T 120 15 T 140 28 M 40 10 L 45 42 M 65 15 L 60 38"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute bottom-[-2px] text-[10px] pb-1 font-serif text-[#cbd5e1] tracking-wide font-semibold">
                    {signerName}
                  </span>
                </div>
                <div className="h-[1px] w-28 bg-[#ffffff]/20 self-end" />
                <div className="text-right space-y-0.5">
                  <div className="text-[9px] text-[#ECC35C] uppercase tracking-widest font-mono font-bold">
                    Protocol Director
                  </div>
                  <div className="text-[8px] text-[#64748b] font-mono">
                    Date: {dateStr}
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Informative Help Text Box */}
        <div className="p-6 bg-slate-950/70 border-t border-white/5 text-center text-xs text-slate-400 print:hidden relative z-20">
          💡 <strong>Export Tip:</strong> You can save the certificate as a high-resolution PDF file by selecting <strong>"Save as PDF"</strong> or directly to your printer. Make sure you enable the <b>"Background graphics"</b> option in the settings to keep the luxury gold gradient.
        </div>
      </div>

      {/* Embedded print CSS style override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-diploma, #printable-diploma * {
            visibility: visible !important;
          }
          #printable-diploma {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            aspect-ratio: 1.414/1 !important;
            border: 8px solid #000 !important;
            box-shadow: none !important;
            transform: none !important;
            margin: 0 !important;
            padding: 40px !important;
            page-break-inside: avoid !important;
            background-color: #04060b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .fixed {
            position: absolute !important;
            background: none !important;
            backdrop-filter: none !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
