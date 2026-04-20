// Thread detail view — post + nested comments (depth 3 default)

const CommentNode = ({ c, depth = 0, maxDepth = 3, onReply }) => {
  const [collapsed, setCollapsed] = React.useState(false);
  const [childrenCollapsed, setChildrenCollapsed] = React.useState(depth >= maxDepth - 1 && c.children?.length > 0);
  const author = USERS[c.author];
  const [myVote, setMyVote] = React.useState(0);
  const n = c.votes + myVote;
  return (
    <div className="relative">
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0">
          <Avatar user={author} size={28} />
          {!collapsed && c.children?.length > 0 && (
            <button onClick={() => setChildrenCollapsed(x => !x)}
              className="mt-2 w-px flex-1 bg-border dark:bg-border-dark hover:bg-sage transition-colors relative">
              <span className="absolute -left-1.5 top-4 w-3 h-3 rounded-full border border-border dark:border-border-dark bg-white dark:bg-charcoal2 grid place-items-center">
                <Icon name={childrenCollapsed ? "Plus" : "Minus"} className="w-2 h-2 text-muted dark:text-muted-dark" strokeWidth={2.4} />
              </span>
            </button>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-ink/90 dark:text-white/90">{author.name}</span>
            <BadgePill karma={author.karma} showKarma={false} />
            <span className="text-muted dark:text-muted-dark">·</span>
            <RelTime ts={c.ts} />
            <button className="ml-auto w-6 h-6 grid place-items-center rounded text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5">
              <Icon name="MoreHorizontal" className="w-3.5 h-3.5" />
            </button>
          </div>
          {!collapsed && (
            <>
              <p className="mt-1 text-[14px] leading-relaxed text-ink/85 dark:text-white/85" style={{ textWrap: 'pretty' }}>
                {c.body}
              </p>
              <div className="mt-1.5 flex items-center gap-1 -ml-2">
                <button onClick={() => setMyVote(v => v === 1 ? 0 : 1)}
                  className={"vote-btn inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-mono " +
                    (myVote === 1 ? "text-sage" : "text-muted dark:text-muted-dark hover:text-sage hover:bg-mist dark:hover:bg-white/5")}>
                  <Icon name="ArrowBigUp" className="w-3.5 h-3.5" strokeWidth={myVote === 1 ? 2.4 : 1.8} />
                  {fmtNum(n)}
                </button>
                <button onClick={() => setMyVote(v => v === -1 ? 0 : -1)}
                  className={"vote-btn w-7 h-7 grid place-items-center rounded-lg " +
                    (myVote === -1 ? "text-rose500" : "text-muted dark:text-muted-dark hover:text-rose500 hover:bg-mist dark:hover:bg-white/5")}>
                  <Icon name="ArrowBigDown" className="w-3.5 h-3.5" strokeWidth={myVote === -1 ? 2.4 : 1.8} />
                </button>
                <button onClick={() => onReply && onReply(c)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-muted dark:text-muted-dark hover:text-ink dark:hover:text-white hover:bg-mist dark:hover:bg-white/5">
                  <Icon name="Reply" className="w-3.5 h-3.5" strokeWidth={2} />
                  Responder
                </button>
                <button onClick={() => setCollapsed(true)}
                  className="inline-flex items-center gap-1 h-7 px-2 rounded-lg text-xs font-medium text-muted dark:text-muted-dark hover:bg-mist dark:hover:bg-white/5">
                  <Icon name="EyeOff" className="w-3.5 h-3.5" strokeWidth={2} />
                  Ocultar
                </button>
              </div>
            </>
          )}
          {collapsed && (
            <button onClick={() => setCollapsed(false)}
              className="text-xs text-sage font-medium mt-1 inline-flex items-center gap-1">
              <Icon name="Eye" className="w-3.5 h-3.5" /> Mostrar comentario
            </button>
          )}
          {!collapsed && !childrenCollapsed && c.children?.length > 0 && (
            <div className="mt-4 space-y-4">
              {c.children.map(child => (
                <CommentNode key={child.id} c={child} depth={depth + 1} maxDepth={maxDepth} onReply={onReply} />
              ))}
            </div>
          )}
          {!collapsed && childrenCollapsed && c.children?.length > 0 && (
            <button onClick={() => setChildrenCollapsed(false)}
              className="mt-3 text-xs font-medium text-sage inline-flex items-center gap-1">
              <Icon name="ChevronDown" className="w-3.5 h-3.5" />
              Ver {c.children.length} {c.children.length === 1 ? 'respuesta' : 'respuestas'} más
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ReplyComposer = ({ onCancel, onSubmit, replyingTo }) => {
  const [text, setText] = React.useState('');
  return (
    <div className="rounded-xl border border-border dark:border-border-dark bg-white dark:bg-charcoal2 p-3">
      {replyingTo && (
        <div className="mb-2 text-xs text-muted dark:text-muted-dark flex items-center gap-1.5">
          <Icon name="CornerDownRight" className="w-3.5 h-3.5" />
          Respondiendo a <span className="font-medium text-ink/80 dark:text-white/80">{USERS[replyingTo.author].name}</span>
          <button onClick={onCancel} className="ml-auto p-0.5 rounded hover:bg-mist dark:hover:bg-white/5"><Icon name="X" className="w-3.5 h-3.5" /></button>
        </div>
      )}
      <div className="flex gap-3">
        <Avatar user={USERS.me} size={28} />
        <div className="flex-1">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribí tu respuesta…"
            rows={3}
            className="w-full resize-none bg-transparent text-[14px] focus:outline-none placeholder-muted dark:placeholder-muted-dark"
          />
          <div className="flex items-center gap-1 pt-2 border-t border-border/60 dark:border-border-dark/60">
            <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" aria-label="Emoji"><Icon name="Smile" className="w-4 h-4" /></button>
            <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" aria-label="Imagen"><Icon name="Image" className="w-4 h-4" /></button>
            <button className="w-8 h-8 grid place-items-center rounded hover:bg-mist dark:hover:bg-white/5 text-muted dark:text-muted-dark" aria-label="Link"><Icon name="Link" className="w-4 h-4" /></button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
              <Button variant="primary" size="sm" onClick={() => { onSubmit(text); setText(''); }} disabled={!text.trim()}>Responder</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ThreadView = ({ post, onBack, setPosts, embedVariant }) => {
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [comments, setComments] = React.useState(COMMENTS[post.id] || []);
  const author = USERS[post.author];

  const vote = (dir) => setPosts(ps => ps.map(p => p.id === post.id ? { ...p, myVote: p.myVote === dir ? 0 : dir } : p));
  const save = () => setPosts(ps => ps.map(p => p.id === post.id ? { ...p, saved: !p.saved } : p));
  const submitReply = (text) => {
    if (!text.trim()) return;
    const nc = { id: 'nc' + Date.now(), author: 'me', ts: 'unos segundos', votes: 1, body: text, children: [] };
    setComments(cs => [nc, ...cs]);
    setReplyingTo(null);
  };

  return (
    <div className="flex-1 min-w-0">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted dark:text-muted-dark hover:text-ink dark:hover:text-white mb-4">
        <Icon name="ArrowLeft" className="w-4 h-4" />
        Volver al feed
      </button>

      <Card className="p-0 fadein">
        <div className="flex">
          <div className="hidden sm:flex flex-col items-center py-4 px-2 border-r border-border dark:border-border-dark">
            <VoteBar post={post} onVote={vote} />
          </div>
          <div className="flex-1 min-w-0 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-xs text-muted dark:text-muted-dark">
              <Avatar user={author} size={28} />
              <div>
                <div className="text-[13px] font-medium text-ink/90 dark:text-white/90">{author.name} <span className="text-muted dark:text-muted-dark font-normal">{author.handle}</span></div>
                <div className="flex items-center gap-1.5"><BadgePill karma={author.karma} /></div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <CatChip id={post.category} />
                <span className="opacity-60">·</span>
                <RelTime ts={post.ts} />
              </div>
            </div>
            <h1 className="mt-4 font-sora font-semibold text-[24px] leading-[1.2] tracking-tight" style={{ textWrap: 'balance' }}>
              {post.title}
            </h1>
            <div className="mt-3 text-[15px] leading-relaxed text-ink/85 dark:text-white/85 whitespace-pre-line" style={{ textWrap: 'pretty' }}>
              {post.body}
            </div>
            {post.embed && (
              <div className="mt-4">
                <MfiEmbed data={post.embed} variant={embedVariant === 'minimal' ? 'rich' : embedVariant} />
              </div>
            )}
            {post.image === 'chart' && <div className="mt-4"><ImagePlaceholder label="gráfico · UVA vs tradicional" aspect="16/9" /></div>}
            {post.image === 'pie' && <div className="mt-4"><ImagePlaceholder label="pie chart · composición CEDEARs" aspect="16/9" /></div>}
            <div className="mt-5 pt-4 border-t border-border/60 dark:border-border-dark/60">
              <PostFooter post={post} onVote={vote} onSave={save} onOpen={() => {}} />
            </div>
          </div>
        </div>
      </Card>

      <div className="mt-5">
        <ReplyComposer onCancel={() => setReplyingTo(null)} onSubmit={submitReply} replyingTo={replyingTo} />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h3 className="font-sora font-semibold text-base">
          {fmtNum(post.comments)} comentarios
        </h3>
        <div className="inline-flex items-center gap-1 text-xs text-muted dark:text-muted-dark">
          <span>Ordenar:</span>
          <button className="font-medium text-ink/80 dark:text-white/80 inline-flex items-center gap-1">
            Mejores primero <Icon name="ChevronDown" className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-6">
        {comments.map(c => (
          <Card key={c.id} className="p-4">
            <CommentNode c={c} depth={0} maxDepth={3} onReply={setReplyingTo} />
          </Card>
        ))}
        {comments.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted dark:text-muted-dark">
            Todavía no hay comentarios. Sé el primero en responder.
          </Card>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { ThreadView, CommentNode });
