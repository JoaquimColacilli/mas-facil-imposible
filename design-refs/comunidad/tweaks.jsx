// Tweaks panel — floating bottom-right when Tweaks is on.

const TweaksPanel = ({ tweaks, setTweaks }) => {
  const Group = ({ label, children }) => (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted dark:text-muted-dark font-semibold mb-1.5">{label}</div>
      {children}
    </div>
  );
  const SegOption = ({ value, current, onClick, children, icon }) => (
    <button onClick={() => onClick(value)}
      className={"flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-2 rounded-md text-[12px] font-medium transition-colors " +
        (current === value
          ? "bg-white dark:bg-charcoal2 text-ink dark:text-white shadow-card"
          : "text-muted dark:text-muted-dark hover:text-ink dark:hover:text-white")}>
      {icon && <Icon name={icon} className="w-3.5 h-3.5" strokeWidth={2} />}
      {children}
    </button>
  );
  const Seg = ({ children }) => (
    <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-mist dark:bg-white/5 border border-border dark:border-border-dark">
      {children}
    </div>
  );
  return (
    <div className="fixed bottom-4 right-4 z-40 w-[280px] rounded-xl border border-border dark:border-border-dark bg-white dark:bg-charcoal2 shadow-pop p-3 fadein">
      <div className="flex items-center gap-2 mb-3">
        <Icon name="SlidersHorizontal" className="w-4 h-4 text-copper" strokeWidth={2.2} />
        <div className="font-sora font-semibold text-sm">Tweaks</div>
        <span className="ml-auto text-[10px] font-mono text-muted dark:text-muted-dark">solo vista previa</span>
      </div>
      <div className="space-y-3">
        <Group label="Tema">
          <Seg>
            <SegOption value="light" current={tweaks.theme} onClick={(v) => setTweaks({ theme: v })} icon="Sun">Light</SegOption>
            <SegOption value="dark"  current={tweaks.theme} onClick={(v) => setTweaks({ theme: v })} icon="Moon">Dark</SegOption>
          </Seg>
        </Group>
        <Group label="Dispositivo">
          <Seg>
            <SegOption value="desktop" current={tweaks.device} onClick={(v) => setTweaks({ device: v })} icon="Monitor">Desktop</SegOption>
            <SegOption value="mobile"  current={tweaks.device} onClick={(v) => setTweaks({ device: v })} icon="Smartphone">Mobile</SegOption>
          </Seg>
        </Group>
        <Group label="Layout del feed">
          <Seg>
            <SegOption value="classic"   current={tweaks.layoutVariant} onClick={(v) => setTweaks({ layoutVariant: v })}>Clásico</SegOption>
            <SegOption value="magazine"  current={tweaks.layoutVariant} onClick={(v) => setTweaks({ layoutVariant: v })}>Magazine</SegOption>
          </Seg>
        </Group>
        <Group label="Categorías">
          <Seg>
            <SegOption value="chips" current={tweaks.categoryVariant} onClick={(v) => setTweaks({ categoryVariant: v })}>Chips</SegOption>
            <SegOption value="tabs"  current={tweaks.categoryVariant} onClick={(v) => setTweaks({ categoryVariant: v })}>Tabs</SegOption>
          </Seg>
        </Group>
        <Group label="Embed de MFI">
          <Seg>
            <SegOption value="compact" current={tweaks.embedVariant} onClick={(v) => setTweaks({ embedVariant: v })}>Compact</SegOption>
            <SegOption value="rich"    current={tweaks.embedVariant} onClick={(v) => setTweaks({ embedVariant: v })}>Rich</SegOption>
            <SegOption value="minimal" current={tweaks.embedVariant} onClick={(v) => setTweaks({ embedVariant: v })}>Chip</SegOption>
          </Seg>
        </Group>
        <Group label="Estado">
          <Seg>
            <SegOption value={false} current={tweaks.showEmpty} onClick={(v) => setTweaks({ showEmpty: v })}>Con posts</SegOption>
            <SegOption value={true}  current={tweaks.showEmpty} onClick={(v) => setTweaks({ showEmpty: v })}>Vacío</SegOption>
          </Seg>
        </Group>
      </div>
    </div>
  );
};

Object.assign(window, { TweaksPanel });
