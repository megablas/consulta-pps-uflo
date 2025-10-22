import React from 'react';
import Card from './Card';
import { CriteriosPanelSkeleton, TableSkeleton } from './Skeletons';
import WelcomeBanner from './WelcomeBanner';

const DashboardLoadingSkeleton: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    <WelcomeBanner isLoading={true} studentDetails={null} studentName="" />
    <CriteriosPanelSkeleton />
    <Card>
      <div className="border-b border-slate-200">
        <div className="-mb-px flex space-x-6">
          <div className="flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm border-blue-500 text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Cargando...</span>
          </div>
        </div>
      </div>
      <div className="pt-6">
        <TableSkeleton />
      </div>
    </Card>
  </div>
);

export default DashboardLoadingSkeleton;
