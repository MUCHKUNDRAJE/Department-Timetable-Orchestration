'use client';

import React from 'react';
import { Users, FlaskConical, DoorOpen, Layers, BarChart2 } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { TargetType } from '@/types/timetable';
import { Badge } from '@/components/ui/Badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export function TargetSelector() {
  const selectedTargetType = useTimetableStore((s) => s.selectedTargetType);
  const selectedTargetId = useTimetableStore((s) => s.selectedTargetId);
  const setSelectedTarget = useTimetableStore((s) => s.setSelectedTarget);

  const classes = useTimetableStore((s) => s.classes);
  const labs = useTimetableStore((s) => s.labs);
  const rooms = useTimetableStore((s) => s.rooms);
  const assignments = useTimetableStore((s) => s.assignments);

  const currentTargets =
    selectedTargetType === 'class'
      ? classes
      : selectedTargetType === 'lab'
      ? labs
      : rooms;

  const currentTargetObj = currentTargets.find((t) => t.id === selectedTargetId) || currentTargets[0];

  // Calculate allocated hours for this target
  const targetAssignments = assignments.filter((a) => {
    if (selectedTargetType === 'class') {
      return (a.targetType === 'class' && a.targetId === selectedTargetId) || a.classId === selectedTargetId;
    }
    if (selectedTargetType === 'lab') {
      return (a.targetType === 'lab' && a.targetId === selectedTargetId) || a.labId === selectedTargetId;
    }
    return (a.targetType === 'room' && a.targetId === selectedTargetId) || a.roomId === selectedTargetId;
  });

  const allocatedHours = targetAssignments.reduce((acc, curr) => acc + curr.duration, 0);
  const totalSlotsWeek = 48; // 6 days * 8 slots
  const percentage = Math.round((allocatedHours / totalSlotsWeek) * 100);

  const handleTypeChange = (type: TargetType) => {
    let firstId = '';
    if (type === 'class') firstId = classes[0]?.id || '';
    if (type === 'lab') firstId = labs[0]?.id || '';
    if (type === 'room') firstId = rooms[0]?.id || '';
    setSelectedTarget(type, firstId);
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Target Category Tabs */}
      <div className="flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
        <button
          onClick={() => handleTypeChange('class')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            selectedTargetType === 'class'
              ? 'bg-surface text-primary shadow-sm border border-border font-bold'
              : 'text-muted hover:text-foreground'
          )}
        >
          <Users className="w-3.5 h-3.5" />
          Classes ({classes.length})
        </button>

        <button
          onClick={() => handleTypeChange('lab')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            selectedTargetType === 'lab'
              ? 'bg-surface text-highlight shadow-sm border border-border font-bold'
              : 'text-muted hover:text-foreground'
          )}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          Labs ({labs.length})
        </button>

        <button
          onClick={() => handleTypeChange('room')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all',
            selectedTargetType === 'room'
              ? 'bg-surface text-primary shadow-sm border border-border font-bold'
              : 'text-muted hover:text-foreground'
          )}
        >
          <DoorOpen className="w-3.5 h-3.5" />
          Rooms ({rooms.length})
        </button>
      </div>

      {/* Target Dropdown & Live Metrics */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
        <div className="flex items-center gap-2 flex-1 md:flex-initial">
          <Layers className="w-4 h-4 text-muted shrink-0" />
          <div className="w-full md:w-72">
            <Select
              value={selectedTargetId}
              onValueChange={(val) => setSelectedTarget(selectedTargetType, val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target entity" />
              </SelectTrigger>
              <SelectContent>
                {currentTargets.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 bg-surface-subtle px-3 py-1.5 rounded-xl border border-border">
          <BarChart2 className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            Allocated: <strong className="text-foreground font-bold">{allocatedHours}</strong> / {totalSlotsWeek} hrs
          </span>
          <Badge variant={percentage > 50 ? 'primary' : 'default'} size="sm">
            {percentage}% Full
          </Badge>
        </div>
      </div>
    </div>
  );
}
