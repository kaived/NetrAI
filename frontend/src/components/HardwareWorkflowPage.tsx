import React from 'react';
import {
  ArrowLeft,
  Bluetooth,
  Cable,
  Camera,
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  Eye,
  FileImage,
  FolderOpen,
  HardDrive,
  Hospital,
  MonitorUp,
  Route,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  Wifi,
} from 'lucide-react';

type HardwareWorkflowPageProps = {
  onBack: () => void;
  onStartScreening: () => void;
};

export const HardwareWorkflowPage: React.FC<HardwareWorkflowPageProps> = ({
  onBack,
  onStartScreening,
}) => (
  <div className="space-y-6 sm:space-y-8">
    <div className="no-print flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition-colors hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 sm:px-4 sm:text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </button>
      <button
        type="button"
        onClick={onStartScreening}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-teal-800 sm:px-4 sm:text-sm"
      >
        <Eye className="h-4 w-4" />
        <span>Start Screening</span>
      </button>
    </div>

    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-slate-950 px-6 py-8 text-white sm:px-10 sm:py-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/40 bg-teal-300/10 px-3.5 py-1.5 text-xs font-bold text-teal-100">
            <Route className="h-4 w-4" />
            <span>Hardware workflow</span>
          </div>
          <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Capture retinal images on the fundus camera. Screen them in NetrAI.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-200 sm:text-base">
            NetrAI does not use the mobile camera for retinal capture. It accepts exported JPG, PNG, or TIFF fundus photographs from portable field cameras and hospital tabletop systems.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 bg-slate-50 p-5 sm:p-8">
          <WorkflowBand
            icon={<Camera className="h-5 w-5" />}
            title="1. Capture"
            copy="Technician captures OD and OS on a portable or tabletop fundus camera."
          />
          <WorkflowBand
            icon={<Download className="h-5 w-5" />}
            title="2. Transfer"
            copy="The camera export reaches the phone, tablet, or hospital computer through local transfer."
          />
          <WorkflowBand
            icon={<UploadCloud className="h-5 w-5" />}
            title="3. Import"
            copy="NetrAI loads the fundus file from Files, Downloads, Gallery, USB, SD card, or a shared folder."
          />
          <WorkflowBand
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="4. Screen and sync"
            copy="The app screens online or offline, saves the case locally, and syncs when internet returns."
          />
        </div>
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WorkflowSurface
        icon={<Smartphone className="h-6 w-6" />}
        title="Rural PHC or field camp"
        copy="Use a portable fundus camera in the camp, then transfer the exported retinal image to the technician's phone or tablet."
        items={[
          'Portable non-mydriatic or smartphone-attached fundus camera',
          'Phone/tablet stores the transferred fundus image',
          'Offline analysis continues when mobile network is unavailable',
          'Pending cases sync later for cloud storage and review',
        ]}
      />
      <WorkflowSurface
        icon={<Hospital className="h-6 w-6" />}
        title="Eye hospital or screening center"
        copy="Use a tabletop fundus camera or hospital imaging workstation, then export the selected image into NetrAI."
        items={[
          'Desktop or non-portable fundus camera capture',
          'USB drive, local folder, or workstation export',
          'Website runs online when hospital internet is available',
          'Android app can still import files if field use is needed',
        ]}
      />
    </section>

    <section className="rounded-3xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="mb-5 max-w-3xl space-y-2">
        <h2 className="text-2xl font-extrabold text-slate-950">Supported transfer paths</h2>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          The connection is about moving the fundus image file into NetrAI. Internet is not required for local import or offline screening.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <TransferPath icon={<Cable className="h-5 w-5" />} title="USB cable" copy="Copy directly from camera, capture phone, tablet, or hospital workstation." />
        <TransferPath icon={<Bluetooth className="h-5 w-5" />} title="Bluetooth" copy="Receive image files when supported by the camera device or paired capture phone." />
        <TransferPath icon={<Wifi className="h-5 w-5" />} title="Wi-Fi or hotspot" copy="Use camera hotspot, Wi-Fi Direct, local sharing, or a device gallery handoff." />
        <TransferPath icon={<HardDrive className="h-5 w-5" />} title="SD card" copy="Move files from camera memory card into the phone, tablet, or computer." />
        <TransferPath icon={<FolderOpen className="h-5 w-5" />} title="Gallery or file manager" copy="Select the saved retinal photo from Downloads, Gallery, Files, or shared folders." />
        <TransferPath icon={<MonitorUp className="h-5 w-5" />} title="Hospital computer export" copy="Upload exported camera images through the website or transfer them to the app for field use." />
      </div>
    </section>

    <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <StatusBlock
        icon={<CloudOff className="h-5 w-5" />}
        title="No internet"
        copy="The installed app runs the bundled ONNX model, creates the report, and saves the case on the device."
      />
      <StatusBlock
        icon={<Cloud className="h-5 w-5" />}
        title="Internet returns"
        copy="Pending cases can sync to the backend so the screening record and artifacts are stored centrally."
      />
      <StatusBlock
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Clinical boundary"
        copy="NetrAI is screening support. Referable or uncertain cases should go to ophthalmologist review."
      />
    </section>
  </div>
);

type WorkflowBandProps = {
  icon: React.ReactNode;
  title: string;
  copy: string;
};

const WorkflowBand: React.FC<WorkflowBandProps> = ({ icon, title, copy }) => (
  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
      {icon}
    </div>
    <div className="min-w-0">
      <h2 className="text-sm font-extrabold text-slate-950 sm:text-base">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{copy}</p>
    </div>
  </div>
);

type WorkflowSurfaceProps = {
  icon: React.ReactNode;
  title: string;
  copy: string;
  items: string[];
};

const WorkflowSurface: React.FC<WorkflowSurfaceProps> = ({ icon, title, copy, items }) => (
  <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-teal-200 bg-teal-50 text-teal-700">
        {icon}
      </div>
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
      </div>
    </div>
    <div className="mt-5 grid grid-cols-1 gap-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  </section>
);

const TransferPath: React.FC<WorkflowBandProps> = ({ icon, title, copy }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white text-teal-700 shadow-2xs">
      {icon}
    </div>
    <h3 className="text-sm font-extrabold text-slate-950 sm:text-base">{title}</h3>
    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">{copy}</p>
  </div>
);

const StatusBlock: React.FC<WorkflowBandProps> = ({ icon, title, copy }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
      {icon}
    </div>
    <h2 className="text-base font-extrabold text-slate-950">{title}</h2>
    <p className="mt-2 text-sm leading-relaxed text-slate-600">{copy}</p>
  </section>
);
