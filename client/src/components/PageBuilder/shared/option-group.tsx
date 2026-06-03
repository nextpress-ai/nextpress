import { SettingsLabel } from './settings-label';

type OptionGroupProps = {
  label: string;
  children: React.ReactNode;
};

export function OptionGroup({ label, children }: OptionGroupProps) {
  return (
    <div className="space-y-3">
      <SettingsLabel>{label}</SettingsLabel>
      <div className="flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}