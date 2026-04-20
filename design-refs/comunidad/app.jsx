// Main App

const DEFAULT_TWEAKS = /*EDITMODE-BEGIN*/{
  "theme": "light",
  "device": "desktop",
  "layoutVariant": "classic",
  "categoryVariant": "chips",
  "embedVariant": "compact",
  "showEmpty": false
}/*EDITMODE-END*/;

const STORAGE_KEY = 'mfi_comunidad_v1';

function App() {
  const persisted = (() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  })();

  const [tweaks, setTweaksRaw] = React.useState({ ...DEFAULT_TWEAKS, ...(persisted.tweaks || {}) });
  const [editMode, setEditMode] = React.useState(false);
  const [view, setView] = React.useState(persisted.view || { screen: 'feed', postId: null });
  const [posts, setPosts] = React.useState(POSTS);
  const [activeCat, setActiveCat] = React.useState('todo');
  const [sort, setSort] = React.useState('recientes');
  const [composerOpen, setComposerOpen] = React.useState(false);

  const setTweaks = (patch) => setTweaksRaw(t => {
    const next = { ...t, ...patch };
    return next;
  });

  // Persist
  React.useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tweaks, view }));
  }, [tweaks, view]);

  // Theme class
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', tweaks.theme === 'dark');
  }, [tweaks.theme]);

  // Tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === '__activate_edit_mode') setEditMode(true);
      if (d.type === '__deactivate_edit_mode') setEditMode(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  // Persist tweaks to editor
  React.useEffect(() => {
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: tweaks }, '*');
  }, [tweaks]);

  const openPost = (id) => setView({ screen: 'thread', postId: id });
  const backToFeed = () => setView({ screen: 'feed', postId: null });

  const publish = (newPost) => {
    setPosts(ps => [newPost, ...ps]);
    setComposerOpen(false);
  };

  const isMobile = tweaks.device === 'mobile';
  const currentPost = posts.find(p => p.id === view.postId);

  // Desktop: full shell. Mobile: phone-shaped frame centered on canvas.
  if (isMobile) {
    return (
      <div className={"min-h-screen w-full grid place-items-center p-6 " + (tweaks.theme === 'dark' ? 'bg-[oklch(0.18_0.012_260)]' : 'bg-[oklch(0.94_0.008_80)]')}>
        <div className="relative">
          {/* phone frame */}
          <div className="rounded-[42px] p-2 shadow-pop"
            style={{ background: tweaks.theme === 'dark' ? 'oklch(0.15 0.012 260)' : 'oklch(0.22 0.012 260)' }}>
            <div className="rounded-[34px] overflow-hidden w-[390px] h-[820px] bg-parchment dark:bg-charcoal flex flex-col relative">
              {/* status bar */}
              <div className="h-10 px-6 flex items-center justify-between text-[13px] font-semibold shrink-0">
                <span>9:41</span>
                <span className="flex items-center gap-1">
                  <Icon name="Signal" className="w-3.5 h-3.5" /> <Icon name="Wifi" className="w-3.5 h-3.5" /> <Icon name="BatteryFull" className="w-4 h-4" />
                </span>
              </div>
              <Topbar theme={tweaks.theme} setTheme={(t) => setTweaks({ theme: t })} onOpenComposer={() => setComposerOpen(true)} mobile />
              <main className="flex-1 overflow-y-auto scrollbar-thin px-4 pt-4 pb-24">
                {view.screen === 'feed' && (
                  <Feed
                    posts={posts} setPosts={setPosts}
                    activeCat={activeCat} setActiveCat={setActiveCat}
                    sort={sort} setSort={setSort}
                    onOpenPost={openPost} onOpenComposer={() => setComposerOpen(true)}
                    layoutVariant={tweaks.layoutVariant}
                    categoryVariant={tweaks.categoryVariant}
                    embedVariant={tweaks.embedVariant}
                    showEmpty={tweaks.showEmpty}
                  />
                )}
                {view.screen === 'thread' && currentPost && (
                  <ThreadView post={currentPost} setPosts={setPosts} onBack={backToFeed} embedVariant={tweaks.embedVariant} />
                )}
              </main>
              <MobileBottomNav active="comunidad" />
              {/* FAB */}
              <button onClick={() => setComposerOpen(true)}
                className="absolute right-4 bottom-20 w-14 h-14 rounded-full bg-sage text-white grid place-items-center shadow-pop active:scale-95 transition-transform">
                <Icon name="Plus" className="w-5 h-5" strokeWidth={2.4} />
              </button>
              {composerOpen && (
                <Composer open={composerOpen} onClose={() => setComposerOpen(false)} onPublish={publish} mobile />
              )}
            </div>
          </div>
        </div>
        {editMode && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
      </div>
    );
  }

  // Desktop
  return (
    <div className="min-h-screen flex bg-parchment dark:bg-charcoal text-ink dark:text-white/95">
      <Sidebar active="comunidad" />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar theme={tweaks.theme} setTheme={(t) => setTweaks({ theme: t })} onOpenComposer={() => setComposerOpen(true)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto w-full max-w-[1240px] px-6 py-6 flex gap-6">
            {view.screen === 'feed' && (
              <Feed
                posts={posts} setPosts={setPosts}
                activeCat={activeCat} setActiveCat={setActiveCat}
                sort={sort} setSort={setSort}
                onOpenPost={openPost} onOpenComposer={() => setComposerOpen(true)}
                layoutVariant={tweaks.layoutVariant}
                categoryVariant={tweaks.categoryVariant}
                embedVariant={tweaks.embedVariant}
                showEmpty={tweaks.showEmpty}
              />
            )}
            {view.screen === 'thread' && currentPost && (
              <ThreadView post={currentPost} setPosts={setPosts} onBack={backToFeed} embedVariant={tweaks.embedVariant} />
            )}
            {view.screen === 'feed' && <RightSidebar onOpenThread={openPost} />}
          </div>
        </main>
      </div>
      {composerOpen && (
        <Composer open={composerOpen} onClose={() => setComposerOpen(false)} onPublish={publish} />
      )}
      {editMode && <TweaksPanel tweaks={tweaks} setTweaks={setTweaks} />}
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
