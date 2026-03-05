'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface CalibrationDialogProps {
  open: boolean;
  onClose: () => void;
  calibrationPoints: { x1: number; y1: number; x2: number; y2: number } | null;
  onCalibrate: (realDistanceMeters: number) => void;
  isSettingPoints: boolean;
  onStartCalibration: () => void;
}

export function CalibrationDialog({
  open,
  onClose,
  calibrationPoints,
  onCalibrate,
  isSettingPoints,
  onStartCalibration,
}: CalibrationDialogProps) {
  const t = useTranslations('plans.calibration');
  const tCommon = useTranslations('common');
  const [distance, setDistance] = useState('');
  const [unit, setUnit] = useState<'m' | 'cm' | 'mm'>('m');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(distance);
    if (isNaN(value) || value <= 0) return;

    let meters = value;
    if (unit === 'cm') meters = value / 100;
    if (unit === 'mm') meters = value / 1000;

    onCalibrate(meters);
    setDistance('');
    onClose();
  };

  const pixelDistance = calibrationPoints
    ? Math.sqrt(
        Math.pow(calibrationPoints.x2 - calibrationPoints.x1, 2) +
        Math.pow(calibrationPoints.y2 - calibrationPoints.y1, 2)
      )
    : 0;

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{t('title')}</DialogTitle>
        <DialogDescription>
          {t('description')}
        </DialogDescription>
      </DialogHeader>

      {!isSettingPoints && !calibrationPoints && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('instructions')}
          </p>
          <Button onClick={onStartCalibration} className="w-full">
            <Ruler className="mr-2 h-4 w-4" />
            {t('selectTwoPoints')}
          </Button>
        </div>
      )}

      {isSettingPoints && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-4">
            <Ruler className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">{t('selectPointsTitle')}</p>
              <p className="text-sm text-muted-foreground">
                {t('selectPointsDesc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {calibrationPoints && !isSettingPoints && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('pixelDistance')}: <strong>{Math.round(pixelDistance)} px</strong>
          </p>
          <div className="space-y-2">
            <Label>{t('realDistance')}</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min="0.001"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder={t('placeholder')}
                required
                className="flex-1"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'm' | 'cm' | 'mm')}
                className="rounded-md border bg-background px-3 text-sm"
              >
                <option value="m">m</option>
                <option value="cm">cm</option>
                <option value="mm">mm</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { onClose(); }}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" variant="outline" onClick={onStartCalibration}>
              {t('retry')}
            </Button>
            <Button type="submit">{t('calibrateButton')}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
