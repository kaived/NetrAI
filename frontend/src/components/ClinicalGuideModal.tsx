import React, { useEffect } from 'react';
import { X, BookOpen, ShieldAlert, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface ClinicalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicalGuideModal: React.FC<ClinicalGuideModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    // Lock page background scrolling when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key to dismiss modal
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
    >
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="shrink-0 bg-white border-b border-slate-200 px-4 py-3.5 sm:px-6 sm:py-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 shrink-0 mt-0.5">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                Clinical Reference & Screening Protocol
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 leading-normal">
                ICDR Diabetic Retinopathy Classification & Rural PHC Quality SOP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200/80 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center transition-all shadow-xs -mr-1"
            title="Close Protocol"
            aria-label="Close"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-700">
          {/* Section 1: ICDR 5-Stage Classification Scale */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1.5">
              1. International Clinical Diabetic Retinopathy (ICDR) Scale
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 font-bold text-slate-800">
                  <tr>
                    <th className="p-2.5 border-b border-r">Grade</th>
                    <th className="p-2.5 border-b border-r">Severity Stage</th>
                    <th className="p-2.5 border-b border-r">Ophthalmoscopic Findings</th>
                    <th className="p-2.5 border-b">PHC Referral Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr className="bg-emerald-50/40">
                    <td className="p-2.5 font-bold font-mono border-r">0</td>
                    <td className="p-2.5 font-semibold text-emerald-800 border-r">No Apparent DR</td>
                    <td className="p-2.5 border-r">No abnormalities or microaneurysms detected.</td>
                    <td className="p-2.5 text-emerald-700 font-medium">Routine Annual Follow-up (12 mo)</td>
                  </tr>
                  <tr className="bg-teal-50/40">
                    <td className="p-2.5 font-bold font-mono border-r">1</td>
                    <td className="p-2.5 font-semibold text-teal-800 border-r">Mild NPDR</td>
                    <td className="p-2.5 border-r">Microaneurysms only.</td>
                    <td className="p-2.5 text-teal-700 font-medium">Re-screen in 6-12 months</td>
                  </tr>
                  <tr className="bg-amber-50/40">
                    <td className="p-2.5 font-bold font-mono border-r text-amber-900">2</td>
                    <td className="p-2.5 font-bold text-amber-800 border-r">Moderate NPDR</td>
                    <td className="p-2.5 border-r">More than microaneurysms but less than Severe NPDR (hard exudates, cotton wool spots).</td>
                    <td className="p-2.5 text-amber-800 font-bold">Refer to Eye Specialist (2-4 wks)</td>
                  </tr>
                  <tr className="bg-orange-50/40">
                    <td className="p-2.5 font-bold font-mono border-r text-orange-900">3</td>
                    <td className="p-2.5 font-bold text-orange-800 border-r">Severe NPDR</td>
                    <td className="p-2.5 border-r">4-2-1 Rule: &gt;20 intraretinal hemorrhages in 4 quadrants, venous beading in 2+, or IRMA in 1+.</td>
                    <td className="p-2.5 text-orange-800 font-bold">Urgent Referral (&lt; 2 wks)</td>
                  </tr>
                  <tr className="bg-rose-50/40">
                    <td className="p-2.5 font-bold font-mono border-r text-rose-900">4</td>
                    <td className="p-2.5 font-bold text-rose-800 border-r">Proliferative DR (PDR)</td>
                    <td className="p-2.5 border-r">Neovascularization, preretinal or vitreous hemorrhage.</td>
                    <td className="p-2.5 text-rose-800 font-bold">Emergency Referral (&lt; 48 hrs)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: Fundus Image Quality SOP for Rural Health Workers */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1.5">
              2. PHC Fundus Image Capture Standard Operating Procedure (SOP)
            </h3>
            <div className="grid sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">Focus & Sharpness</span>
                <p className="text-slate-600">
                  Ensure the fine retinal vascular branches around the optic disc and fovea are crisp. Hard minimum focus score: 0.75; target: 1.0+.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">Illumination & Exposure</span>
                <p className="text-slate-600">
                  Avoid excessive camera flash (bleaching) or severe under-illumination. Hard minimum brightness: 0.10; target range: 0.15 to 0.75.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">Centering Protocol</span>
                <p className="text-slate-600">
                  Capture macula-centered or optic-disc-centered fundus fields without eyelid / eyelash obstruction.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">Dilation & Pupil Size</span>
                <p className="text-slate-600">
                  In non-mydriatic cameras, ensure the exam room is dimmed to allow natural pupillary dilation to &gt;4mm.
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Rural PHC Clinical Action Protocol */}
          <section className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1.5">
              3. Rural PHC Recommended Action Protocol
            </h3>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">1. Triage Priority</span>
                <p className="text-slate-600">
                  Urgent referral to District Ophthalmic Specialist within 2-4 weeks for referable DR (Grade 2-4). Annual routine screening recall (12 months) for Grade 0-1.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">2. Primary Care Guidance</span>
                <p className="text-slate-600">
                  Evaluate HbA1c glycemic control, blood pressure (target &lt;130/80 mmHg), and serum lipid profile at every visit.
                </p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="font-bold text-slate-800 block">3. Patient Counseling</span>
                <p className="text-slate-600">
                  Advise immediate medical attention if sudden vision drop, new floaters, or dark spots occur. Reinforce diet and lifestyle compliance.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
