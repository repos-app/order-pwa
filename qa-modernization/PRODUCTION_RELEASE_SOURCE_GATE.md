# izakanpai 本番リリース前のGit確定ゲート

本番Worker・Web・DBへ反映する前に、**全ソースのコミット・GitHubへのpushを必須**とする。
未コミット、未追跡、未pushの変更が存在すればリリースを停止する。

既存のWorkerリリースエントリ `scripts/release/deploy-impacted-workers.mjs` は
以下を必須チェックとする。

- リリース対象がmainまたはmainと同一SHAの隔離チェックアウトであること
- Git worktreeの全件についてtracked/untrackedの未コミット変更がないこと
- ローカルHEADと、キャッシュした `origin/main` だけでなく**実際のGitHub `main`** のSHAが一致すること
- 上記条件をリリース開始時と本番反映直前に再検証すること

汚れた開発worktreeを残しながら隔離worktreeのコードだけを公開する操作は行わない。
未コミットの作業は内容を確認してコミットし、必要なら他のブランチの変更を
mainへ統合・テストしてからpushする。変更を勝手にstash・破棄・隠蔽しない。

DBのマイグレーションおよびWebの本番反映も、確定・push済みのソースを
使って計画と権限に従って実行する。Workerだけが完了した状態を全リリース
完了とみなさない。
