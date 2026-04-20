// Composer modal — with category selector, title, body, toolbar, attachments, MFI embed

const COMPOSER_EMOJIS = ['😀','😂','🥹','😎','🙏','👍','🔥','💪','💸','💰','📈','📉','🤑','🪙','🏦','🧠','✅','❓','💡','🫡'];

const MfiAttachPicker = ({ onSelect, onClose }) => {
  const items = [
    { kind: 'txn',  title: 'Ahorro mensual recurrente', amount: 80000, currency: 'ARS', category: 'Gastos fijos' },
    { kind: 'txn',  title: 'Compra CEDEAR SPY', amount: 145000, currency: 'ARS', category: 'Inversiones' },
    { kind: 'goal', title: 'U$S 5.000 en 12 meses', current: 1680, target: 5000, currency: 'USD', months: 4, totalMonths: 12 },
    { kind: 'goal', title: 'Viaje a Brasil', current: 620000, target: 1500000, currency: 'ARS', months: 3, totalMonths: 8 },
  ];
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-charcoal2 p-3 shadow-pop">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted dark:text-muted-dark uppercase tracking-wider">Adjuntar desde MFI</div>
        <button onClick={onClose} className="w-6 h-6 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5"><Icon name="X" className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
        {items.map((it, i) => (
          <button key={i} onClick={() => onSelect(it)} className="w-full text-left p-2 rounded-lg hover:bg-mist dark:hover:bg-white/5">
            <MfiEmbed data={it} variant="compact" />
          </button>
        ))}
      </div>
    </div>
  );
};

const Composer = ({ open, onClose, onPublish, mobile }) => {
  const [category, setCategory] = React.useState('inversiones');
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [images, setImages] = React.useState([]);
  const [embed, setEmbed] = React.useState(null);
  const [showEmoji, setShowEmoji] = React.useState(false);
  const [showMfiPicker, setShowMfiPicker] = React.useState(false);
  const bodyRef = React.useRef(null);

  React.useEffect(() => {
    if (!open) {
      setCategory('inversiones'); setTitle(''); setBody(''); setImages([]); setEmbed(null); setShowEmoji(false); setShowMfiPicker(false);
    }
  }, [open]);

  if (!open) return null;

  const insertEmoji = (e) => {
    setBody(b => b + e);
    setShowEmoji(false);
    bodyRef.current?.focus();
  };

  const addImage = () => setImages(imgs => [...imgs, { id: 'img' + Date.now(), label: 'imagen ' + (imgs.length + 1) }]);

  const canPublish = title.trim().length > 0;

  const sheetClass = mobile
    ? "w-full max-w-full sheetin rounded-t-2xl max-h-[92dvh] overflow-y-auto scrollbar-thin"
    : "w-[640px] max-w-[92vw] max-h-[86vh] sheetin rounded-2xl overflow-hidden flex flex-col";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6">
      <div className="absolute inset-0 bg-black/45 backdropin" onClick={onClose}></div>
      <div className={"relative bg-white dark:bg-charcoal2 border border-border dark:border-border-dark " + sheetClass}>
        {/* Header */}
        <div className="flex items-center gap-2 px-5 h-14 border-b border-border dark:border-border-dark shrink-0">
          <h2 className="font-sora font-semibold">Nueva publicación</h2>
          <button onClick={onClose} className="ml-auto w-8 h-8 grid place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/5" aria-label="Cerrar">
            <Icon name="X" className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4 space-y-4">
          {/* Author */}
          <div className="flex items-center gap-2.5">
            <Avatar user={USERS.me} size={32} />
            <div>
              <div className="text-sm font-medium">{USERS.me.name}</div>
              <div className="text-[11px] text-muted dark:text-muted-dark"><BadgePill karma={USERS.me.karma} /></div>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted dark:text-muted-dark font-medium">Categoría</label>
            <div className="mt-1.5 flex gap-1.5 flex-wrap">
              {CATEGORIES.filter(c => c.id !== 'todo').map(cat => {
                const isActive = cat.id === category;
                return (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className={"inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] font-medium border transition-colors " +
                      (isActive
                        ? "bg-sage text-white border-sage"
                        : "bg-white dark:bg-charcoal2 border-border dark:border-border-dark text-ink/80 dark:text-white/80 hover:border-sage/40")}>
                    <Icon name={cat.icon} className="w-3.5 h-3.5" strokeWidth={2} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted dark:text-muted-dark font-medium">Título</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Un título claro y directo…"
              maxLength={140}
              className="mt-1.5 w-full h-11 rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 px-3 text-[15px] font-sora font-medium placeholder-muted dark:placeholder-muted-dark focus:outline-none focus:border-sage focus:bg-white dark:focus:bg-charcoal"
            />
            <div className="mt-1 text-[11px] text-muted dark:text-muted-dark text-right font-mono">{title.length}/140</div>
          </div>

          {/* Body */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-muted dark:text-muted-dark font-medium">Contenido</label>
            <div className="mt-1.5 rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 focus-within:border-sage focus-within:bg-white dark:focus-within:bg-charcoal transition-colors">
              {/* Toolbar */}
              <div className="flex items-center gap-0.5 px-2 h-10 border-b border-border/60 dark:border-border-dark/60">
                <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark font-bold text-sm" title="Negrita">B</button>
                <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark italic font-serif text-sm" title="Itálica">I</button>
                <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" title="Link"><Icon name="Link" className="w-4 h-4" /></button>
                <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" title="Lista"><Icon name="List" className="w-4 h-4" /></button>
                <div className="w-px h-5 bg-border dark:bg-border-dark mx-1"></div>
                <div className="relative">
                  <button onClick={() => setShowEmoji(s => !s)} className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" title="Emoji">
                    <Icon name="Smile" className="w-4 h-4" />
                  </button>
                  {showEmoji && (
                    <div className="absolute top-10 left-0 z-10 rounded-xl border border-border dark:border-border-dark bg-white dark:bg-charcoal2 p-2 shadow-pop grid grid-cols-5 gap-1 w-56 fadein">
                      {COMPOSER_EMOJIS.map(e => (
                        <button key={e} onClick={() => insertEmoji(e)} className="w-9 h-9 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-xl">{e}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addImage} className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" title="Imagen"><Icon name="Image" className="w-4 h-4" /></button>
                <div className="ml-auto relative">
                  <button onClick={() => setShowMfiPicker(s => !s)} className="inline-flex items-center gap-1.5 h-8 px-2 rounded text-xs font-medium text-sage hover:bg-sage/10">
                    <Icon name="Link2" className="w-3.5 h-3.5" strokeWidth={2.2} />
                    Adjuntar de MFI
                  </button>
                  {showMfiPicker && (
                    <div className="absolute top-10 right-0 z-10 w-80 fadein">
                      <MfiAttachPicker onSelect={(it) => { setEmbed(it); setShowMfiPicker(false); }} onClose={() => setShowMfiPicker(false)} />
                    </div>
                  )}
                </div>
              </div>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Contá tu experiencia, tu jugada, tu duda…"
                rows={6}
                className="w-full resize-none bg-transparent px-3 py-3 text-[14.5px] leading-relaxed placeholder-muted dark:placeholder-muted-dark focus:outline-none"
              />
            </div>
          </div>

          {/* Image previews */}
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map(img => (
                <div key={img.id} className="relative">
                  <ImagePlaceholder label={img.label} aspect="4/3" />
                  <button onClick={() => setImages(is => is.filter(x => x.id !== img.id))}
                    className="absolute top-1.5 right-1.5 w-7 h-7 grid place-items-center rounded-full bg-white/90 dark:bg-charcoal2/90 border border-border dark:border-border-dark hover:bg-white dark:hover:bg-charcoal2"
                    aria-label="Eliminar imagen">
                    <Icon name="X" className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Embed preview */}
          {embed && (
            <div className="relative">
              <MfiEmbed data={embed} variant="rich" />
              <button onClick={() => setEmbed(null)}
                className="absolute top-2 right-2 w-7 h-7 grid place-items-center rounded-full bg-white/90 dark:bg-charcoal2/90 border border-border dark:border-border-dark hover:bg-white"
                aria-label="Quitar adjunto">
                <Icon name="X" className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-5 h-16 border-t border-border dark:border-border-dark shrink-0">
          <div className="text-xs text-muted dark:text-muted-dark">
            <span className="inline-flex items-center gap-1"><Icon name="Info" className="w-3.5 h-3.5" /> Revisá las <button className="underline hover:text-sage">reglas</button> antes de publicar.</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!canPublish}
              className={!canPublish ? 'opacity-50 cursor-not-allowed' : ''}
              onClick={() => {
                if (!canPublish) return;
                onPublish({
                  id: 'np' + Date.now(),
                  author: 'me',
                  category,
                  title: title.trim(),
                  body: body.trim() || '—',
                  image: images.length > 0 ? 'uploaded' : null,
                  votes: 1, myVote: 1, comments: 0, saved: false,
                  embed,
                  ts: 'unos segundos',
                });
              }}
            >Publicar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Composer });
