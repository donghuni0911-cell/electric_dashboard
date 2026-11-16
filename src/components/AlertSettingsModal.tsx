import React, { useState } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { AlertRule, RegionCode } from '../types/market';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: AlertRule[];
  defaultRegion: RegionCode;
  onAddRule: (rule: Omit<AlertRule, 'id' | 'createdAt'>) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  isPhoneView: boolean;
}

const REGION_NAMES: Record<RegionCode, string> = {
  all: '전국 통합',
  land: '육지',
  jeju: '제주',
};

export function AlertSettingsModal({
  isOpen,
  onClose,
  rules,
  defaultRegion,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  isPhoneView,
}: AlertSettingsModalProps) {
  const [region, setRegion] = useState<RegionCode>(defaultRegion);
  const [condition, setCondition] = useState<'below' | 'above'>('below');
  const [thresholdWon, setThresholdWon] = useState<string>('110');
  const [notifyOnSolarSurplus, setNotifyOnSolarSurplus] = useState<boolean>(true);
  const [notifyOnPeakSurge, setNotifyOnPeakSurge] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericVal = Math.max(10, Math.min(500, Number(thresholdWon) || 110));
    onAddRule({
      region,
      condition,
      thresholdWon: numericVal,
      notifyOnSolarSurplus,
      notifyOnPeakSurge,
      enabled: true,
    });
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-[#0f172a]/40 backdrop-blur-[4px] ${
        isPhoneView ? 'items-end p-0' : 'items-end sm:items-center p-0 sm:p-4'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="alert-modal-title"
    >
      <div
        className={`sheet-level-3 w-full border border-[#cbd5e1] overflow-hidden max-h-[88vh] flex flex-col ${
          isPhoneView
            ? 'max-w-[412px] mx-auto rounded-t-3xl'
            : 'sm:max-w-lg rounded-t-3xl sm:rounded-2xl'
        }`}
      >
        {/* Drag Handle for Mobile */}
        <div className={`${isPhoneView ? 'flex' : 'sm:hidden flex'} pt-3 pb-1 justify-center`}>
          <div className="w-10 h-1.5 rounded-full bg-[#cbd5e1]" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className={`py-4 border-b border-[#f1f5f9] flex items-center justify-between gap-3 ${isPhoneView ? 'px-5' : 'px-5 sm:px-6'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#eff4ff] text-[#1d4ed8] flex items-center justify-center">
              <Bell className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="alert-modal-title" className="text-base sm:text-lg font-semibold text-[#0b1c30]">
                실시간 시세 알림 설정
              </h2>
              <p className="text-xs text-[#747686]">
                원하는 SMP 단가 도달 시 즉시 화면으로 알려드립니다.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="알림 설정 닫기"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-[#434655] hover:bg-[#f1f5f9] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className={`overflow-y-auto space-y-6 ${isPhoneView ? 'p-5' : 'p-5 sm:p-6'}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`grid gap-3 ${isPhoneView ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
              <div>
                <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                  적용 권역
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as RegionCode)}
                  className="h-12 w-full px-3 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-sm font-semibold text-[#0b1c30]"
                >
                  <option value="all">전국 통합</option>
                  <option value="land">육지</option>
                  <option value="jeju">제주</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#434655] mb-1.5">
                  알림 조건
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as 'below' | 'above')}
                  className="h-12 w-full px-3 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-sm font-semibold text-[#0b1c30]"
                >
                  <option value="below">기준 단가 이하 하락 시</option>
                  <option value="above">기준 단가 이상 상승 시</option>
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="alert-threshold-input"
                className="block text-xs font-semibold text-[#434655] mb-1.5"
              >
                목표 SMP 단가 (원/kWh)
              </label>
              <input
                id="alert-threshold-input"
                type="number"
                min="10"
                max="500"
                step="0.5"
                value={thresholdWon}
                onChange={(e) => setThresholdWon(e.target.value)}
                className="h-12 w-full px-3.5 rounded-lg bg-white border border-[#cbd5e1] focus:border-2 focus:border-[#1d4ed8] focus:outline-none text-base font-semibold text-[#0b1c30] tabular-nums font-mono"
              />
            </div>

            {/* 20x20px Checkboxes */}
            <div className="space-y-2.5 pt-1">
              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={notifyOnSolarSurplus}
                  onClick={() => setNotifyOnSolarSurplus((v) => !v)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                    notifyOnSolarSurplus
                      ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white'
                      : 'bg-white border-[#cbd5e1] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="text-sm text-[#0b1c30]">
                  태양광 잉여 발전으로 시세가 15% 이상 낮아질 때 알림
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer min-h-[36px]">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={notifyOnPeakSurge}
                  onClick={() => setNotifyOnPeakSurge((v) => !v)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                    notifyOnPeakSurge
                      ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white'
                      : 'bg-white border-[#cbd5e1] text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
                <span className="text-sm text-[#0b1c30]">
                  피크 부하 진입으로 요금 절약 주의 필요 시 알림
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-12 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              새 시세 알림 규칙 추가
            </button>
          </form>

          {/* Saved Rules List */}
          <div className="pt-4 border-t border-[#f1f5f9]">
            <h3 className="text-xs font-semibold text-[#747686] mb-3">
              등록된 알림 규칙 ({rules.length}개)
            </h3>
            {rules.length === 0 ? (
              <p className="text-sm text-[#747686] py-3">
                등록된 알림이 없습니다. 위 양식에서 목표 단가를 설정해 보세요.
              </p>
            ) : (
              <ul className="divide-y divide-[#f1f5f9]">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={rule.enabled}
                        aria-label="알림 활성화 전환"
                        onClick={() => onToggleRule(rule.id)}
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 cursor-pointer ${
                          rule.enabled
                            ? 'bg-[#1d4ed8] border-[#1d4ed8] text-white'
                            : 'bg-white border-[#cbd5e1] text-transparent'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0b1c30] truncate tabular-nums">
                          {REGION_NAMES[rule.region]} · {rule.thresholdWon.toFixed(1)}원/kWh{' '}
                          {rule.condition === 'below' ? '이하' : '이상'}
                        </p>
                        <p className="text-xs text-[#747686] truncate">
                          {rule.notifyOnSolarSurplus ? '태양광 잉여 포함' : '단가 조건만'} ·{' '}
                          {rule.enabled ? '활성화됨' : '일시 정지'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteRule(rule.id)}
                      aria-label="알림 규칙 삭제"
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-[#747686] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
