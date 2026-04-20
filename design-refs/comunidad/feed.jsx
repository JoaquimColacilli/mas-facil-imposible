// Feed screen — two layout variants (classic and magazine) + two category UIs (chips, tabs)

const VoteBar = ({ post, orientation = 'vertical', onVote }) => {
  const n = post.votes + (post.myVote || 0);
  const voted = post.myVote;
  const isVert = orientation === 'vertical';
  return (
    <div className={(isVert ? "flex flex-col items-center" : "flex items-center") + " gap-0.5 select-none"}>
      <button
        onClick={(e) => { e.stopPropagation(); onVote(+1); }}
        className={"vote-btn w-8 h-8 rounded-lg grid place-items-center " +
          (voted === 1 ? "text-sage bg-sage/10" : "text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5")}
        aria-label="Votar positivo"
      >
        <Icon name="ArrowBigUp" className="w-4 h-4" strokeWidth={voted === 1 ? 2.4 : 1.8} />
      </button>
      <span className={"font-mono text-[12px] tabular-nums min-w-[24px] text-center " +
        (voted === 1 ? "text-sage" : voted === -1 ? "text-rose500" : "text-ink/85 dark:text-white/85")}>
        {fmtNum(n)}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); onVote(-1); }}
        className={"vote-btn w-8 h-8 rounded-lg grid place-items-center " +
          (voted === -1 ? "text-rose500 bg-rose500/10" : "text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5")}
        aria-label="Votar negativo"
      >
        <Icon name="ArrowBigDown" className="w-4 h-4" strokeWidth={voted === -1 ? 2.4 : 1.8} />
      </button>
    </div>
  );
};

const PostFooter = ({ post, onVote, onSave, onOpen, compact = false }) => (
  <div className={"flex items-center gap-1 " + (compact ? "text-xs" : "text-[13px]")}>
    <div className="flex items-center gap-1 rounded-lg bg-mist dark:bg-white/5 px-1">
      <button onClick={(e) => { e.stopPropagation(); onVote(+1); }}
        className={"vote-btn w-7 h-7 grid place-items-center rounded-lg " +
          (post.myVote === 1 ? "text-sage" : "text-muted dark:text-muted-dark hover:text-sage")}
        aria-label="Positivo">
        <Icon name="ArrowBigUp" className="w-4 h-4" strokeWidth={post.myVote === 1 ? 2.4 : 1.8} />
      </button>
      <span className={"font-mono text-[12px] tabular-nums min-w-[22px] text-center " +
        (post.myVote === 1 ? "text-sage" : post.myVote === -1 ? "text-rose500" : "")}>
        {fmtNum(post.votes + (post.myVote || 0))}
      </span>
      <button onClick={(e) => { e.stopPropagation(); onVote(-1); }}
        className={"vote-btn w-7 h-7 grid place-items-center rounded-lg " +
          (post.myVote === -1 ? "text-rose500" : "text-muted dark:text-muted-dark hover:text-rose500")}
        aria-label="Negativo">
        <Icon name="ArrowBigDown" className="w-4 h-4" strokeWidth={post.myVote === -1 ? 2.4 : 1.8} />
      </button>
    </div>
    <button onClick={(e) => { e.stopPropagation(); onOpen(); }}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5 font-medium">
      <Icon name="MessageSquare" className="w-4 h-4" strokeWidth={1.8} />
      <span className="font-mono text-xs tabular-nums">{post.comments}</span>
      <span className="hidden sm:inline">comentarios</span>
    </button>
    <button onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5 font-medium">
      <Icon name="Share2" className="w-4 h-4" strokeWidth={1.8} />
      <span className="hidden sm:inline">Compartir</span>
    </button>
    <button onClick={(e) => { e.stopPropagation(); onSave(); }}
      className={"inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg font-medium ml-auto " +
        (post.saved
          ? "text-copper"
          : "text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5")}>
      <Icon name={post.saved ? "Bookmark" : "Bookmark"} className="w-4 h-4" strokeWidth={post.saved ? 2.6 : 1.8} />
      <span className="hidden sm:inline">{post.saved ? 'Guardado' : 'Guardar'}</span>
    </button>
  </div>
);

// Card — classic
const PostCardClassic = ({ post, onVote, onSave, onOpen, embedVariant }) => {
  const author = USERS[post.author];
  return (
    <Card hoverable className="p-0 cursor-pointer fadein" onClick={onOpen}>
      <div className="flex">
        {/* vote rail (desktop) */}
        <div className="hidden sm:flex flex-col items-center py-3 px-2 border-r border-border dark:border-border-dark">
          <VoteBar post={post} onVote={onVote} />
        </div>
        <div className="flex-1 min-w-0 p-4 sm:pl-4">
          <div className="flex items-center gap-2 text-xs text-muted dark:text-muted-dark">
            <Avatar user={author} size={22} />
            <span className="font-medium text-ink/85 dark:text-white/85">{author.name}</span>
            <BadgePill karma={author.karma} showKarma={false} />
            <span>·</span>
            <RelTime ts={post.ts} />
            <span className="ml-auto"><CatChip id={post.category} size="xs" /></span>
          </div>
          <h3 className="mt-2 font-sora font-semibold text-[17px] leading-snug" style={{ textWrap: 'pretty' }}>
            {post.title}
          </h3>
          <p className="mt-1.5 text-sm text-ink/75 dark:text-white/75 leading-relaxed line-clamp-3 whitespace-pre-line">
            {post.body}
          </p>
          {post.embed && (
            <div className="mt-3">
              <MfiEmbed data={post.embed} variant={embedVariant} />
            </div>
          )}
          {post.image === 'chart' && (
            <div className="mt-3">
              <ImagePlaceholder label="gráfico · UVA vs tradicional" aspect="16/9" />
            </div>
          )}
          {post.image === 'pie' && (
            <div className="mt-3">
              <ImagePlaceholder label="pie chart · composición CEDEARs" aspect="16/9" />
            </div>
          )}
          <div className="mt-3">
            <PostFooter post={post} onVote={onVote} onSave={onSave} onOpen={onOpen} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// Card — magazine (novel variant: larger type, category as a vertical tag ribbon, hero treatment)
const PostCardMagazine = ({ post, onVote, onSave, onOpen, embedVariant }) => {
  const author = USERS[post.author];
  const cat = CATEGORIES.find(c => c.id === post.category);
  const colorMap = {
    sage: 'oklch(0.50 0.10 155)', copper: 'oklch(0.60 0.10 65)',
    sky500: 'oklch(0.55 0.12 230)', violet500: 'oklch(0.55 0.14 295)',
    rose500: 'oklch(0.60 0.14 15)', emerald500: 'oklch(0.55 0.12 155)', muted: 'oklch(0.55 0.008 260)',
  };
  const c = colorMap[cat?.color] || colorMap.muted;
  return (
    <Card hoverable className="p-0 cursor-pointer overflow-hidden fadein" onClick={onOpen}>
      <div className="flex">
        {/* category ribbon */}
        <div
          className="hidden sm:flex flex-col items-center justify-start gap-3 w-10 py-4 border-r border-border dark:border-border-dark shrink-0"
          style={{ background: 'color-mix(in oklch, ' + c + ' 6%, transparent)' }}
        >
          <span className="grid place-items-center w-6 h-6 rounded" style={{ color: c }}>
            <Icon name={cat?.icon || 'LayoutGrid'} className="w-4 h-4" strokeWidth={2.2} />
          </span>
          <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: c }}>
            {cat?.label}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-4 sm:p-5">
          <div className="flex items-center gap-2 text-xs text-muted dark:text-muted-dark">
            <Avatar user={author} size={24} />
            <span className="font-medium text-ink/85 dark:text-white/85">{author.name}</span>
            <span className="opacity-60">·</span>
            <RelTime ts={post.ts} />
            <span className="ml-auto"><BadgePill karma={author.karma} showKarma={true} /></span>
          </div>
          <h3 className="mt-3 font-sora font-semibold text-xl leading-[1.2] tracking-tight" style={{ textWrap: 'balance' }}>
            {post.title}
          </h3>
          <p className="mt-2 text-[14.5px] text-ink/80 dark:text-white/80 leading-relaxed line-clamp-3 whitespace-pre-line">
            {post.body}
          </p>
          {post.embed && (
            <div className="mt-3">
              <MfiEmbed data={post.embed} variant={embedVariant} />
            </div>
          )}
          {post.image === 'chart' && (
            <div className="mt-3"><ImagePlaceholder label="gráfico · UVA vs tradicional" aspect="21/9" /></div>
          )}
          {post.image === 'pie' && (
            <div className="mt-3"><ImagePlaceholder label="pie chart · composición CEDEARs" aspect="21/9" /></div>
          )}
          <div className="mt-4 pt-3 border-t border-border/60 dark:border-border-dark/60">
            <PostFooter post={post} onVote={onVote} onSave={onSave} onOpen={onOpen} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// Composer input (inline, sticky at top of feed)
const ComposerTrigger = ({ onOpen }) => (
  <Card className="p-2.5 flex items-center gap-3">
    <Avatar user={USERS.me} size={36} />
    <button onClick={onOpen} className="flex-1 h-10 rounded-lg border border-border dark:border-border-dark bg-parchment2 dark:bg-ink/40 px-3 text-left text-sm text-muted dark:text-muted-dark hover:border-sage/40 transition-colors focus-ring">
      ¿Qué querés compartir, {USERS.me.name.split(' ')[0]}?
    </button>
    <div className="hidden sm:flex items-center gap-1">
      <button onClick={onOpen} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" aria-label="Adjuntar imagen">
        <Icon name="Image" className="w-4 h-4" />
      </button>
      <button onClick={onOpen} className="w-9 h-9 grid place-items-center rounded-lg hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" aria-label="Adjuntar de MFI">
        <Icon name="Link2" className="w-4 h-4" />
      </button>
    </div>
    <Button variant="primary" size="md" onClick={onOpen} icon="Plus">Publicar</Button>
  </Card>
);

// Category selector — chips OR tabs
const CategoryChips = ({ active, onChange }) => (
  <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-2 px-2">
    {CATEGORIES.map(cat => {
      const isActive = cat.id === active;
      return (
        <button key={cat.id} onClick={() => onChange(cat.id)}
          className={"shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-medium border transition-colors focus-ring " +
            (isActive
              ? "bg-sage text-white border-sage"
              : "bg-white dark:bg-charcoal2 border-border dark:border-border-dark text-ink/80 dark:text-white/80 hover:border-sage/40")}
        >
          <Icon name={cat.icon} className="w-3.5 h-3.5" strokeWidth={2} />
          {cat.label}
        </button>
      );
    })}
  </div>
);

const CategoryTabs = ({ active, onChange }) => (
  <div className="border-b border-border dark:border-border-dark">
    <div className="flex gap-1 overflow-x-auto no-scrollbar -mx-1 px-1">
      {CATEGORIES.map(cat => {
        const isActive = cat.id === active;
        return (
          <button key={cat.id} onClick={() => onChange(cat.id)}
            className={"shrink-0 relative inline-flex items-center gap-1.5 h-11 px-3 text-[13px] font-medium transition-colors focus-ring " +
              (isActive
                ? "text-sage"
                : "text-muted dark:text-muted-dark hover:text-ink dark:hover:text-white")}
          >
            <Icon name={cat.icon} className="w-3.5 h-3.5" strokeWidth={isActive ? 2.4 : 1.8} />
            {cat.label}
            {isActive && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-sage rounded-full" />}
          </button>
        );
      })}
    </div>
  </div>
);

const SortToggle = ({ sort, setSort }) => {
  const opts = [
    { id: 'recientes', label: 'Recientes', icon: 'Clock' },
    { id: 'votados',   label: 'Más votados', icon: 'TrendingUp' },
    { id: 'trending',  label: 'Trending', icon: 'Flame' },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-mist dark:bg-white/5 border border-border dark:border-border-dark">
      {opts.map(o => (
        <button key={o.id} onClick={() => setSort(o.id)}
          className={"inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12.5px] font-medium transition-colors " +
            (sort === o.id
              ? "bg-white dark:bg-charcoal2 text-ink dark:text-white shadow-card"
              : "text-muted dark:text-muted-dark hover:text-ink dark:hover:text-white")}
        >
          <Icon name={o.icon} className="w-3.5 h-3.5" strokeWidth={2} />
          {o.label}
        </button>
      ))}
    </div>
  );
};

const RightSidebar = ({ onOpenThread }) => (
  <aside className="hidden xl:block w-[300px] shrink-0 space-y-4">
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Icon name="Flame" className="w-4 h-4 text-copper" strokeWidth={2.2} />
        <h3 className="font-sora font-semibold">Hilos trending</h3>
      </div>
      <div className="mt-3 space-y-2.5">
        {TRENDING.map((t, i) => (
          <button key={t.id} onClick={() => onOpenThread(t.id)}
            className="w-full text-left group p-2 -mx-2 rounded-lg hover:bg-mist dark:hover:bg-white/5">
            <div className="flex items-start gap-2">
              <span className="font-mono text-[11px] text-muted dark:text-muted-dark mt-0.5 w-4">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-snug group-hover:text-sage font-medium" style={{ textWrap: 'pretty' }}>{t.title}</div>
                <div className="mt-1 flex items-center gap-2 text-[11px] text-muted dark:text-muted-dark">
                  <CatChip id={t.category} size="xs" />
                  <span>·</span>
                  <span className="font-mono">{fmtNum(t.comments)} coment.</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>

    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Icon name="BookOpen" className="w-4 h-4 text-sage" strokeWidth={2.2} />
        <h3 className="font-sora font-semibold">Reglas de la comunidad</h3>
      </div>
      <ol className="mt-3 space-y-2 text-[13px] text-ink/80 dark:text-white/80">
        {RULES.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-mono text-[11px] text-muted dark:text-muted-dark shrink-0 w-4 pt-0.5">{String(i + 1).padStart(2, '0')}</span>
            <span style={{ textWrap: 'pretty' }}>{r}</span>
          </li>
        ))}
      </ol>
    </Card>

    <Card className="p-4">
      <div className="flex items-center gap-2">
        <Icon name="Activity" className="w-4 h-4 text-copper" strokeWidth={2.2} />
        <h3 className="font-sora font-semibold">Tus stats</h3>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: 'Posts', value: 8 },
          { label: 'Coment.', value: 46 },
          { label: 'Karma', value: USERS.me.karma },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-parchment2 dark:bg-ink/40 p-2 border border-border dark:border-border-dark text-center">
            <div className="font-mono text-lg text-ink dark:text-white">{fmtNum(s.value)}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted dark:text-muted-dark">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px]">
          <BadgePill karma={USERS.me.karma} showKarma={false} />
          <span className="font-mono text-muted dark:text-muted-dark">{USERS.me.karma}/500</span>
        </div>
        <div className="mt-1.5 h-1 bg-mist dark:bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-sage rounded-full" style={{ width: (USERS.me.karma / 500 * 100) + '%' }} />
        </div>
        <div className="mt-1 text-[10px] text-muted dark:text-muted-dark">Faltan {500 - USERS.me.karma} para Inversor</div>
      </div>
    </Card>
  </aside>
);

// Empty state
const EmptyState = ({ onCompose }) => (
  <Card className="p-10 grid place-items-center text-center">
    <div className="relative w-16 h-16 mb-4">
      <div className="absolute inset-0 rounded-2xl border border-border dark:border-border-dark grid place-items-center bg-parchment2 dark:bg-ink/40">
        <Icon name="MessagesSquare" className="w-7 h-7 text-sage" strokeWidth={1.8} />
      </div>
      <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full border border-border dark:border-border-dark bg-white dark:bg-charcoal2 grid place-items-center">
        <Icon name="Sparkles" className="w-3 h-3 text-copper" strokeWidth={2.2} />
      </div>
    </div>
    <h3 className="font-sora font-semibold text-lg">Todavía no hay publicaciones acá.</h3>
    <p className="mt-1 text-sm text-muted dark:text-muted-dark max-w-sm">
      Sé el primero en compartir. Contá una jugada, una pregunta o una meta — alguien la está buscando.
    </p>
    <div className="mt-5">
      <Button variant="primary" icon="Plus" onClick={onCompose}>Crear publicación</Button>
    </div>
    <div className="mt-4 flex items-center gap-3 text-xs text-muted dark:text-muted-dark">
      <span className="inline-flex items-center gap-1"><Icon name="MessageSquare" className="w-3 h-3" /> 0 posts</span>
      <span className="inline-flex items-center gap-1"><Icon name="Users" className="w-3 h-3" /> 1.240 miembros</span>
    </div>
  </Card>
);

const Feed = ({ posts, setPosts, activeCat, setActiveCat, sort, setSort, onOpenPost, onOpenComposer, layoutVariant, categoryVariant, embedVariant, showEmpty }) => {
  const filtered = React.useMemo(() => {
    let list = posts;
    if (activeCat !== 'todo') list = list.filter(p => p.category === activeCat);
    if (sort === 'votados') list = [...list].sort((a, b) => (b.votes + (b.myVote||0)) - (a.votes + (a.myVote||0)));
    if (sort === 'trending') list = [...list].sort((a, b) => b.comments - a.comments);
    return list;
  }, [posts, activeCat, sort]);

  const vote = (id, dir) => setPosts(ps => ps.map(p => {
    if (p.id !== id) return p;
    const my = p.myVote === dir ? 0 : dir;
    return { ...p, myVote: my };
  }));
  const save = (id) => setPosts(ps => ps.map(p => p.id === id ? { ...p, saved: !p.saved } : p));

  const Card = layoutVariant === 'magazine' ? PostCardMagazine : PostCardClassic;

  return (
    <div className="flex-1 min-w-0 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-sora font-semibold text-[28px] leading-tight tracking-tight">Comunidad</h1>
            <p className="mt-0.5 text-sm text-muted dark:text-muted-dark">Compartí y aprendé con otros.</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted dark:text-muted-dark">
            <Icon name="Users" className="w-3.5 h-3.5" />
            <span className="font-mono">1.240</span> miembros
            <span className="opacity-50">·</span>
            <span className="font-mono">{fmtNum(posts.length)}</span> publicaciones hoy
          </div>
        </div>
      </div>

      <ComposerTrigger onOpen={onOpenComposer} />

      {categoryVariant === 'tabs'
        ? <CategoryTabs active={activeCat} onChange={setActiveCat} />
        : <CategoryChips active={activeCat} onChange={setActiveCat} />
      }

      <div className="flex items-center justify-between">
        <SortToggle sort={sort} setSort={setSort} />
        <div className="text-xs text-muted dark:text-muted-dark hidden sm:block">
          <span className="font-mono">{fmtNum(filtered.length)}</span> {filtered.length === 1 ? 'publicación' : 'publicaciones'}
        </div>
      </div>

      {showEmpty || filtered.length === 0 ? (
        <EmptyState onCompose={onOpenComposer} />
      ) : (
        <div className="space-y-3">
          {filtered.map(p => (
            <Card
              key={p.id}
              post={p}
              onVote={(dir) => vote(p.id, dir)}
              onSave={() => save(p.id)}
              onOpen={() => onOpenPost(p.id)}
              embedVariant={embedVariant}
            />
          ))}
        </div>
      )}
    </div>
  );
};

Object.assign(window, { Feed, RightSidebar, EmptyState, VoteBar, PostFooter });
