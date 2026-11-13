/* Owner-only account controls. The existing account.html session and RPC
 * gateway remain authoritative; no second authentication or tenant state. */
(function () {
  'use strict';
  function el(id) { return document.getElementById(id); }
  function show(id, ja, en, ok) {
    var node = el(id);
    if (!node) return;
    node.textContent = document.documentElement.dataset.lang === 'en' ? en : ja;
    node.className = 'status ' + (ok ? 'ok' : 'err');
    node.style.display = '';
  }
  function showMappedError(id,error) {
    var node=el(id);
    if(!node)return;
    node.textContent=API.userErrorText(error);
    node.className='status err';
    node.style.display='';
  }
  function ownerEmailRequestError(error) {
    var messages = {
      wrong_password: ['現在のパスワードが違います。', 'Incorrect current password.'],
      same_email: ['現在と同じメールアドレスです。', 'This is already your email address.'],
      email_taken: [
        'このメールアドレスは既に他の店舗のオーナーに登録されています。別のアドレスを指定してください。',
        'This email address is already registered to another store owner. Use a different address.'
      ],
      email_change_check_unavailable: [
        'メールアドレスの重複確認ができませんでした。後で再試行してください。確認メールは送信していません。',
        'Email availability could not be checked. Try again later. No verification email was sent.'
      ],
      email_change_sync_pending: [
        '前のメールアドレス変更を同期中です。確認リンクから再試行してください。',
        'The previous email change is still syncing. Retry using its verification link.'
      ],
      retry_later: ['試行回数の上限です。しばらくしてから再試行してください。',
        'Too many attempts. Please try again later.'],
      email_delivery_failed: ['メールを送信できませんでした。後で再試行してください。',
        'The verification email could not be delivered. Try again later.']
    };
    return messages[error] || null;
  }
  window.OwnerAccountUI = {
    init: async function (rpc) {
      var profile;
      try {
        profile = await rpc('getOwnerAccountProfile');
        if (!profile || profile.success !== true || !profile.loginId) throw new Error('account_owner_required');
      } catch (error) {
        showMappedError('ownerStatus',error);
        el('requestCard').style.display = 'none';
        el('cancelCard').style.display = 'none';
        return;
      }
      el('ownerControls').style.display = '';
      el('ownerCurrentEmail').textContent = profile.email;
      if (profile.pendingEmail) show('ownerStatus',
        '変更先への確認メールを送信済みです。メール内のリンクで確定してください。',
        'A verification link was sent to the new address. Open it to confirm.', true);
      else if (profile.syncingEmail) show('ownerStatus',
        'メールの確認は完了しています。変更リンクから登録の同期を再試行してください。',
        'Email verified. Reopen the link to finish account synchronization.', false);

      el('ownerEmailBtn').addEventListener('click', async function () {
        var next = el('ownerNewEmail').value.trim().toLowerCase();
        var password = el('ownerEmailPassword').value;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) || next.length > 254 || !password) {
          show('ownerEmailMsg', 'メールアドレスと現在のパスワードを入力してください。',
            'Enter a valid email and your current password.', false);
          return;
        }
        this.disabled = true;
        try {
          var result = await rpc('requestOwnerEmailChange', { newEmail: next, password: password,
            lang: document.documentElement.dataset.lang === 'en' ? 'en' : 'ja' });
          if (!result || result.success !== true) {
            var message = ownerEmailRequestError(result && result.error);
            if(message)show('ownerEmailMsg', message[0], message[1], false);
            else showMappedError('ownerEmailMsg',result&&result.error||'email_change_failed');
            return;
          }
          el('ownerEmailPassword').value = '';
          show('ownerEmailMsg',
            '新しいメールアドレスへ確認リンクを送りました。確認完了までは元のアドレスが有効です。',
            'A verification link was sent to your new address. Your old address remains active until confirmed.', true);
        } catch (error) {
          showMappedError('ownerEmailMsg',error);
        } finally { this.disabled = false; }
      });

      el('ownerPasswordBtn').addEventListener('click', async function () {
        var oldPass = el('ownerOldPass').value;
        var newPass = el('ownerNewPass').value;
        var confirm = el('ownerConfirmPass').value;
        if (!oldPass || newPass.length < 8 || newPass.length > 200 || newPass !== confirm) {
          show('ownerPasswordMsg',
            '現在のパスワードと8文字以上の新パスワードを入力し、確認欄を一致させてください。',
            'Enter your current password and matching new passwords of at least 8 characters.', false);
          return;
        }
        this.disabled = true;
        try {
          // Reuse the established changePasswordByLogin flow and its atomic
          // session revocation rather than implementing a second password API.
          var response = await API.post('changePasswordByLogin', {
            storeId: profile.storeId, loginId: profile.loginId, oldPass: oldPass, newPass: newPass
          });
          var result = response && response.data;
          if (!result || result.success !== true) {
            showMappedError('ownerPasswordMsg',result&&result.error||'password_change_failed');
            return;
          }
          el('ownerOldPass').value = '';
          el('ownerNewPass').value = '';
          el('ownerConfirmPass').value = '';
          show('ownerPasswordMsg',
            '変更しました。既存のログインは無効になったため、新しいパスワードで再ログインしてください。',
            'Password updated. All prior sessions were revoked. Log in again.', true);
        } catch (error) {
          showMappedError('ownerPasswordMsg',error);
        } finally { this.disabled = false; }
      });
    }
  };
})();
