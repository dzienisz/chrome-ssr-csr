'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Badge, Text, Metric } from '@tremor/react';

interface AnalysisData {
  id: number;
  domain: string;
  url?: string;
  render_type: string;
  confidence: number;
  timestamp: string;
  frameworks?: string[];
  core_web_vitals?: {
    lcp?: number | null;
    cls?: number | null;
    fid?: number | null;
    ttfb?: number | null;
  };
  tech_stack?: Record<string, string | string[] | null>;
  hydration_stats?: {
    score?: number;
    errorCount?: number;
  };
  navigation_stats?: {
    isSPA?: boolean;
    clientRoutes?: number;
  };
}

interface Props {
  analysis: AnalysisData | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalysisDetailModal({ analysis, isOpen, onClose }: Props) {
  if (!analysis) return null;

  const formatDate = (date: string) => new Date(date).toLocaleString();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-900 p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100 flex justify-between items-center">
                  <span>Analysis Details</span>
                  <button onClick={onClose} className="text-gray-400 hover:text-gray-500">×</button>
                </Dialog.Title>

                <div className="mt-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Text className="text-xs uppercase text-gray-500">Domain</Text>
                      <a 
                        href={`https://${analysis.domain}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-lg truncate block text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        {analysis.domain} ↗
                      </a>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Text className="text-xs uppercase text-gray-500">Timestamp</Text>
                      <Text className="text-sm font-medium">{formatDate(analysis.timestamp)}</Text>
                    </div>
                  </div>

                  {/* Render Type */}
                  <div className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                         <Text className="text-sm text-gray-500">Render Strategy</Text>
                         <div className="flex items-center gap-2 mt-1">
                           <Metric className="text-xl">{analysis.render_type}</Metric>
                           <Badge size="xs" color="gray">{analysis.confidence}% conf.</Badge>
                         </div>
                      </div>
                      <div className="text-right">
                         <Text className="text-sm text-gray-500">Frameworks</Text>
                         <div className="flex flex-wrap justify-end gap-1 mt-1">
                           {analysis.frameworks?.map((fw: string) => (
                             <Badge key={fw} size="xs" color="blue">{fw}</Badge>
                           )) || <Text className="text-sm">-</Text>}
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Phase 3: Hydration & Navigation */}
                  {analysis.hydration_stats && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border border-orange-100 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10 rounded-lg">
                        <Text className="text-xs font-bold text-orange-800 dark:text-orange-200 uppercase mb-2">Hydration Health</Text>
                        <div className="flex justify-between items-end">
                           <div>
                             <Text className="text-xs text-orange-600/80">Score</Text>
                             <Text className="text-xl font-bold text-orange-700">{analysis.hydration_stats.score}</Text>
                           </div>
                           <div className="text-right">
                             <Text className="text-xs text-orange-600/80">Errors</Text>
                             <Text className="text-lg font-medium text-orange-700">{analysis.hydration_stats.errorCount}</Text>
                           </div>
                        </div>
                      </div>

                      {analysis.navigation_stats && (
                        <div className="p-3 border border-sky-100 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-900/10 rounded-lg">
                          <Text className="text-xs font-bold text-sky-800 dark:text-sky-200 uppercase mb-2">Navigation (SPA)</Text>
                          <div className="flex justify-between items-end">
                             <div>
                               <Text className="text-xs text-sky-600/80">Type</Text>
                               <Badge size="xs" color={analysis.navigation_stats.isSPA ? "blue" : "gray"}>
                                 {analysis.navigation_stats.isSPA ? "SPA" : "MPA"}
                               </Badge>
                             </div>
                             <div className="text-right">
                               <Text className="text-xs text-sky-600/80">Routes</Text>
                               <Text className="text-lg font-medium text-sky-700">{analysis.navigation_stats.clientRoutes}</Text>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Phase 2: Tech Stack */}
                  {analysis.tech_stack && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Text className="text-xs uppercase text-gray-500 mb-2">Tech Stack</Text>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(analysis.tech_stack).map(([key, value]) => {
                          if (!value || (Array.isArray(value) && value.length === 0)) return null;
                          return (
                            <div key={key} className="flex flex-col bg-white dark:bg-gray-700 px-2 py-1 rounded border border-gray-200 dark:border-gray-600">
                              <span className="text-[10px] text-gray-400 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Phase 1: Core Web Vitals */}
                  {analysis.core_web_vitals && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Text className="text-xs uppercase text-gray-500 mb-2">Core Web Vitals</Text>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                          <Text className="text-xs text-gray-400">LCP</Text>
                          <Text className="font-medium text-sm">{analysis.core_web_vitals.lcp ? `${analysis.core_web_vitals.lcp}ms` : '-'}</Text>
                        </div>
                        <div>
                          <Text className="text-xs text-gray-400">CLS</Text>
                          <Text className="font-medium text-sm">{analysis.core_web_vitals.cls ?? '-'}</Text>
                        </div>
                        <div>
                          <Text className="text-xs text-gray-400">FID</Text>
                          <Text className="font-medium text-sm">{analysis.core_web_vitals.fid ? `${analysis.core_web_vitals.fid}ms` : '-'}</Text>
                        </div>
                        <div>
                          <Text className="text-xs text-gray-400">TTFB</Text>
                          <Text className="font-medium text-sm">{analysis.core_web_vitals.ttfb ? `${analysis.core_web_vitals.ttfb}ms` : '-'}</Text>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
