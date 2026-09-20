import React, { useState } from 'react';
import { ViewTab, RoadSegment } from './types';
import { MOCK_ROADS } from './mockData';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { TrafficMap } from './components/TrafficMap';
import { SimulationEngine } from './components/SimulationEngine';
import { SchoolBusOptimization } from './components/SchoolBusOptimization';
import { PublicTransportView } from './components/PublicTransportView';
import { FreightManagementView } from './components/FreightManagementView';
import { OptimizationRecommendation } from './components/OptimizationRecommendation';
import { BeforeAfterComparison } from './components/BeforeAfterComparison';
import { ReportsView } from './components/ReportsView';
import { RoadAnalysisDrawer } from './components/RoadAnalysisDrawer';
import { BeginnerGuideModal } from './components/BeginnerGuideModal';
import { InteractiveWalkthroughModal } from './components/InteractiveWalkthroughModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<ViewTab>('overview');
  const [selectedRoad, setSelectedRoad] = useState<RoadSegment | null>(MOCK_ROADS[0]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isWalkthroughOpen, setIsWalkthroughOpen] = useState(false);

  const handleSelectRoad = (road: RoadSegment) => {
    setSelectedRoad(road);
    setIsDrawerOpen(true);
  };

  const handleSelectRoadById = (roadId: string) => {
    const found = MOCK_ROADS.find((r) => r.id === roadId) || MOCK_ROADS[0];
    setSelectedRoad(found);
    setIsDrawerOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc] selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenBeginnerGuide={() => setIsGuideOpen(true)}
        onOpenQuickDemo={() => setIsWalkthroughOpen(true)}
        isLiveActive={true}
      />

      {/* Main View Router */}
      <main className="flex-1 w-full pt-16">
        {currentTab === 'overview' && (
          <Hero
            onOpenDashboard={() => setCurrentTab('live-traffic')}
            onLaunchFlagshipDemo={() => setCurrentTab('simulation')}
            onOpenBeginnerGuide={() => setIsGuideOpen(true)}
            onSelectRoad={handleSelectRoadById}
          />
        )}

        {currentTab === 'live-traffic' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-xs font-bold text-teal-600 tracking-wider uppercase">Live Telemetry Feed</span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Pune Metropolitan Traffic Network
                </h1>
                <p className="text-sm text-slate-500 mt-0.5">
                  Real-time corridor speed, density, school bus loads, and bottleneck detection
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentTab('optimization')}
                  className="btn-gradient-primary px-4 py-2 text-xs font-semibold flex items-center gap-2"
                >
                  View Recommendations
                </button>
                <button
                  onClick={() => setCurrentTab('simulation')}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Launch ACO Engine
                </button>
              </div>
            </div>

            {/* Live Map & Drawer layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
              <div className="lg:col-span-2 h-[600px]">
                <TrafficMap
                  roads={MOCK_ROADS}
                  selectedRoadId={selectedRoad?.id || null}
                  onSelectRoad={handleSelectRoad}
                  isOptimizedView={false}
                />
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                      Active Corridors ({MOCK_ROADS.length})
                    </h3>
                    <span className="text-[11px] font-semibold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                      Auto-refresh 5s
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                    {MOCK_ROADS.map((r) => (
                      <div
                        key={r.id}
                        onClick={() => handleSelectRoad(r)}
                        className={`p-3 rounded-xl cursor-pointer border transition-all ${
                          selectedRoad?.id === r.id
                            ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                            : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">{r.name}</span>
                          <span
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                              r.status === 'critical'
                                ? 'bg-rose-100 text-rose-700'
                                : r.status === 'high'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {r.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                          <span>Speed: <strong className="text-slate-700">{r.currentSpeedKmh} km/h</strong></span>
                          <span>Delay: <strong className="text-slate-700">+{r.delayMinutes} min</strong></span>
                          <span>Buses: <strong className="text-slate-700">{r.schoolBusCount}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setIsDrawerOpen(true)}
                  className="w-full mt-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Open Corridor Deep Dive
                </button>
              </div>
            </div>
          </div>
        )}

        {currentTab === 'school-buses' && (
          <SchoolBusOptimization
            onSimulateSchoolTraffic={() => setCurrentTab('simulation')}
            onBack={() => setCurrentTab('overview')}
          />
        )}

        {currentTab === 'public-transport' && (
          <PublicTransportView onBackToDashboard={() => setCurrentTab('overview')} />
        )}

        {currentTab === 'freight' && (
          <FreightManagementView onBackToDashboard={() => setCurrentTab('overview')} />
        )}

        {currentTab === 'optimization' && (
          <OptimizationRecommendation
            onOpenSchoolBusOptimization={() => setCurrentTab('school-buses')}
            onLaunchSimulation={() => setCurrentTab('simulation')}
            onBackToDashboard={() => setCurrentTab('overview')}
          />
        )}

        {currentTab === 'simulation' && (
          <SimulationEngine
            roads={MOCK_ROADS}
            onSelectRoad={handleSelectRoad}
            onViewBeforeAfter={() => setCurrentTab('reports')}
          />
        )}

        {currentTab === 'reports' && (
          <div className="max-w-7xl mx-auto px-4 py-6">
            <BeforeAfterComparison
              onApplyOptimization={() => setCurrentTab('simulation')}
              onBackToSimulation={() => setCurrentTab('simulation')}
              onBackToDashboard={() => setCurrentTab('overview')}
            />
          </div>
        )}
      </main>

      {/* Road Deep Dive Drawer */}
      {isDrawerOpen && (
        <RoadAnalysisDrawer
          road={selectedRoad}
          onClose={() => setIsDrawerOpen(false)}
          onOptimize={() => {
            setIsDrawerOpen(false);
            setCurrentTab('simulation');
          }}
          onInspectSchoolFleet={() => {
            setIsDrawerOpen(false);
            setCurrentTab('school-buses');
          }}
        />
      )}

      {/* Beginner Guide Modal */}
      <BeginnerGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        onStartDemo={() => {
          setIsGuideOpen(false);
          setIsWalkthroughOpen(true);
        }}
      />

      {/* Interactive Walkthrough Modal */}
      <InteractiveWalkthroughModal
        isOpen={isWalkthroughOpen}
        onClose={() => setIsWalkthroughOpen(false)}
        onNavigateTab={(tab) => {
          setCurrentTab(tab);
          setIsWalkthroughOpen(false);
        }}
        onSelectRoad={handleSelectRoad}
        roads={MOCK_ROADS}
      />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenGuide={() => setIsGuideOpen(true)}
      />
    </div>
  );
};

export default App;
