import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GREENWOOD_BUS_FLEET } from '../mockData';
import { SchoolBus } from '../types';

interface SchoolBusOptimizationProps {
  onSimulateSchoolTraffic: () => void;
  onBack: () => void;
}

export const SchoolBusOptimization: React.FC<SchoolBusOptimizationProps> = ({
  onSimulateSchoolTraffic,
  onBack,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Rerouted' | 'Retimed' | 'Direct'>('All');
  const [selectedBus, setSelectedBus] = useState<SchoolBus | null>(GREENWOOD_BUS_FLEET[0]);

  const filteredBuses = GREENWOOD_BUS_FLEET.filter((bus) => {
    const matchesSearch =
      bus.busId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.recommendedRoute.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || bus.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 pb-24">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer bg-transparent border-none p-0 transition-colors"
        >
          <span>←</span>
          <span>Back to Recommendation</span>
        </button>

        <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
          FLEET COORDINATION ENGINE • TARGET 07:00 AM
        </span>
      </div>

      {/* Main School Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-50 via-white to-purple-50 border border-slate-200 shadow-md mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">
              Flagship Scenario Case Study
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Pune Educational Institutions — School Fleet Optimization
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Target Arrival: <strong className="text-slate-900">07:00 AM</strong> • Total Fleet: <strong className="text-slate-900">50 School Buses</strong> • 2,140 Students
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs max-w-xs">
            <span className="text-[10.5px] font-bold text-rose-700 uppercase tracking-wider block">Identified Bottleneck</span>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              38 buses concentrated on Wakad / Hinjawadi corridor during the same morning peak window.
            </p>
          </div>
        </div>

        {/* 3 Metric Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Route A (Hinjawadi Main)</span>
            <p className="text-xl font-extrabold text-teal-700 mt-1">32 Buses <span className="text-xs font-normal text-slate-500">(Staggered -6)</span></p>
            <p className="text-[11px] text-slate-500 mt-0.5">Reduced from 38 buses to relieve pressure</p>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 shadow-xs">
            <span className="text-[11px] text-teal-800 font-semibold uppercase block">Route B (Baner Bypass)</span>
            <p className="text-xl font-extrabold text-teal-800 mt-1">18 Buses <span className="text-xs font-semibold text-teal-600">(+18 Shifted)</span></p>
            <p className="text-[11px] text-teal-700 mt-0.5">Utilizes Baner-Balewadi bypass (35% load)</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <span className="text-[11px] text-slate-500 font-semibold uppercase block">Departure Window</span>
            <p className="text-xl font-extrabold text-slate-900 mt-1">06:32 – 06:46 AM</p>
            <p className="text-[11px] text-teal-700 font-medium mt-0.5">100% on-time arrival before 07:00 AM</p>
          </div>
        </div>
      </motion.div>

      {/* Core Principle Banner */}
      <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-xs sm:text-sm text-teal-950 mb-6 flex items-center gap-3">
        <span className="font-bold">Core Principle:</span>
        <span>FLOWOPT optimizes the school fleet <em>collectively</em> across multiple corridors and staggered departures instead of independently routing every single bus.</span>
      </div>

      {/* Fleet Table & Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 luminous-card p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <input
              type="text"
              placeholder="Search bus ID or driver..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-800 outline-none w-full sm:w-60 focus:border-teal-500"
            />

            <div className="flex gap-1">
              {(['All', 'Rerouted', 'Retimed', 'Direct'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                    statusFilter === status
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold">
                  <th className="py-2.5 px-2">BUS ID</th>
                  <th className="py-2.5 px-2">ORIGINAL</th>
                  <th className="py-2.5 px-2">RECOMMENDED ROUTE</th>
                  <th className="py-2.5 px-2">DEPARTURE</th>
                  <th className="py-2.5 px-2">OPTIMIZED ETA</th>
                  <th className="py-2.5 px-2">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredBuses.map((bus) => {
                  const isSelected = selectedBus?.busId === bus.busId;
                  return (
                    <tr
                      key={bus.busId}
                      onClick={() => setSelectedBus(bus)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/80 font-medium' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-2 font-bold text-slate-900">{bus.busId}</td>
                      <td className="py-2.5 px-2 text-slate-500">{bus.currentRoute}</td>
                      <td className="py-2.5 px-2 font-semibold text-teal-800">{bus.recommendedRoute}</td>
                      <td className="py-2.5 px-2 text-slate-700">
                        <span className="line-through text-slate-400 mr-1.5 text-[11px]">{bus.currentDeparture}</span>
                        <strong className="text-amber-700">{bus.recommendedDeparture}</strong>
                      </td>
                      <td className="py-2.5 px-2 text-teal-700 font-bold">{bus.recommendedEta}</td>
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            bus.status === 'Rerouted'
                              ? 'bg-teal-100 text-teal-800'
                              : bus.status === 'Retimed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {bus.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Bus Telemetry Card */}
        {selectedBus && (
          <div className="luminous-card p-6 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center text-[11px] font-bold text-teal-800 uppercase">
                <span>Fleet Telemetry</span>
                <span>ID: {selectedBus.busId}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mt-2">Driver: {selectedBus.driverName}</h3>

              <div className="flex flex-col gap-2.5 mt-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
                  <span className="text-[10.5px] text-slate-500 font-semibold uppercase block">Capacity & Students</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {selectedBus.studentsCount} / {selectedBus.capacity} seats ({selectedBus.occupancyRate}%)
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200/60">
                  <span className="text-[10.5px] text-rose-700 font-semibold uppercase block">Original Uncoordinated ETA</span>
                  <p className="text-sm font-bold text-rose-800 mt-0.5">{selectedBus.currentEta}</p>
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200/60">
                  <span className="text-[10.5px] text-teal-800 font-semibold uppercase block">FLOWOPT Guaranteed ETA</span>
                  <p className="text-sm font-bold text-teal-800 mt-0.5">{selectedBus.recommendedEta}</p>
                </div>
              </div>
            </div>

            <button
              onClick={onSimulateSchoolTraffic}
              className="btn-gradient-primary w-full py-3 rounded-full font-bold text-xs cursor-pointer shadow-md mt-6"
            >
              Simulate School Fleet Network →
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="flex items-center justify-between mt-8">
        <span className="text-xs text-slate-500">Ready to test multi-corridor equilibrium under simulated rush hour?</span>
        <motion.button
          onClick={onSimulateSchoolTraffic}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="btn-gradient-primary px-8 py-3.5 rounded-full text-xs sm:text-sm font-bold cursor-pointer"
        >
          Simulate School Traffic →
        </motion.button>
      </div>
    </div>
  );
};
export default SchoolBusOptimization;
