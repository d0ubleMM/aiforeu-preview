// Voice: selbst mit dem Assistenten sprechen. Aufbau wie die Browser-Demo der Voice-Website:
// Mikrofon, Pegel, Sprechbeginn/-ende, Zeitlimit und Aufräumen sind echt. Ohne eingehängten Dienst antwortet
// eine Attrappe nach dem gewählten Beispielgespräch, gesprochen von der Sprachausgabe des Browsers.
//
// ECHTEN SPRACHDIENST EINHÄNGEN (wie auf der Voice-Website): vor diesem Skript setzen
//   window.AIFOREU_VOICE = { connect: async ctx => ({ onSpeech(event) {}, stop() {} }) }
// ctx.stream (Mikrofon), ctx.onAgent(text), ctx.onCaller(text), ctx.onNote(text), ctx.onStatus(text).
// Sitzungstoken immer vom eigenen Server holen, nie einen festen Schlüssel in diese Datei schreiben.
(() => {
  const box = document.querySelector('[data-mikro]');
  if (!box || !window.stufen) return;
  const kapitel = box.closest('[data-stufen]');
  const $ = s => box.querySelector(s);
  const startBtn = $('[data-mikro-start]'), stopBtn = $('[data-mikro-stopp]'), statusEl = $('[data-mikro-status]'), uhrEl = $('[data-mikro-uhr]');
  const LIMIT = 120, VERBINDEN_MAX = 12000, AN = .045, AUS = .028, STILLE = 700;
  const BEREIT = 'Der Assistent hört zu, sprechen Sie einfach.', ENDE = 'Das Beispiel ist zu Ende. Beenden Sie die Demo oder sprechen Sie weiter.';
  // lauf: Nummer der aktuellen Sitzung. Alles, was zu einer älteren Sitzung gehört, wird verworfen.
  let lauf = 0, stream = null, ctx = null, raf = null, uhr = null, sitzung = null, rest = LIMIT, spricht = false, stilleSeit = 0, timer = [];
  let waechter = null; // Wächter der laufenden Sprachausgabe, gehört zur Sitzung
  let gesperrt = false; // während der Assistent antwortet, zählt das Mikrofon nicht (kein Echo, keine Doppelschritte)
  const sag = t => { statusEl.textContent = t; };
  const fall = () => kapitel.querySelector('[data-fall-inhalt]:not([hidden])');
  const pegel = v => fall()?.querySelector('.vd-kreis')?.style.setProperty('--pegel', v);
  const spaeter = (fn, ms) => { const id = lauf; timer.push(setTimeout(() => { if (id === lauf) fn(); }, ms)); };

  // Sprachausgabe mit deutscher Stimme. Jede Äußerung hat ihr eigenes Ende; ein Wächter springt ein,
  // falls der Browser kein Ende meldet, und wird beim echten Ende wieder gelöscht.
  const tts = 'speechSynthesis' in window;
  let stimme = null;
  const waehleStimme = () => { const v = tts ? speechSynthesis.getVoices() : []; stimme = v.find(x => /^de/i.test(x.lang) && /Anna|Petra|Katja|Helena/i.test(x.name)) || v.find(x => /^de/i.test(x.lang)) || null; };
  if (tts) { waehleStimme(); speechSynthesis.addEventListener?.('voiceschanged', waehleStimme); }
  const sprich = text => new Promise(fertig => {
    const id = lauf;
    let erledigt = false, w = null;
    const ende = () => { if (erledigt) return; erledigt = true; clearTimeout(w); if (id === lauf) kapitel.dataset.wer = ''; fertig(id === lauf); };
    kapitel.dataset.wer = 'bot';
    const dauer = Math.min(14000, 2500 + (text || '').length * 80);
    if (!tts || !text) { waechter = w = setTimeout(ende, text ? Math.min(9000, Math.max(1400, text.length * 52)) : 0); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'de-DE'; if (stimme) u.voice = stimme; u.rate = 1.04;
    u.onend = ende; u.onerror = ende;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
    waechter = w = setTimeout(() => { if (!erledigt && id === lauf) { speechSynthesis.cancel(); ende(); } }, dauer);
  });

  // Attrappe: schaltet das gewählte Beispielgespräch weiter, getaktet vom echten Mikrofon.
  const attrappe = {
    connect(c) {
      const begruessung = fall()?.querySelector('.vd-ki[data-stufe="0"]')?.textContent || '';
      gesperrt = true; c.onStatus('Der Assistent antwortet …');
      sprich(begruessung).then(ok => { if (!ok) return; gesperrt = false; c.onStatus(BEREIT); });
      return Promise.resolve({
        onSpeech(ev) {
          if (gesperrt) return;
          if (ev === 'start') return c.onStatus('Sie sprechen …');
          const { a, n } = window.stufen.stand(kapitel);
          if (a >= n - 1) return c.onStatus(ENDE);
          gesperrt = true;
          window.stufen.zeige(kapitel, a + 1);
          c.onStatus('Der Assistent antwortet …');
          spaeter(() => {
            const naechste = Math.min(n - 1, a + 2);
            window.stufen.zeige(kapitel, naechste);
            const text = fall()?.querySelector(`.vd-ki[data-stufe="${naechste}"]`)?.textContent || '';
            sprich(text).then(ok => { if (!ok) return; gesperrt = false; c.onStatus(naechste >= n - 1 ? ENDE : BEREIT); });
          }, 900);
        },
        stop() {}
      });
    }
  };

  // Ein eingehängter Dienst schreibt echte Beiträge in das Telefon und die Hintergrundschritte.
  const eigeneZeile = (wo, cls, text) => {
    const ol = fall()?.querySelector(wo); if (!ol || !text) return;
    const li = document.createElement('li'); li.className = 'eigen an ' + cls; li.textContent = text; ol.append(li);
  };

  const hoere = () => {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    ctx = new C();
    const an = ctx.createAnalyser(); an.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Float32Array(an.fftSize);
    const bild = () => {
      an.getFloatTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length), jetzt = Date.now();
      pegel(Math.min(1, rms * 7).toFixed(3));
      if (gesperrt && !sitzung?.eigen) { spricht = false; stilleSeit = 0; }
      else if (!spricht && rms > AN) { spricht = true; stilleSeit = 0; kapitel.dataset.wer = 'du'; sitzung?.onSpeech?.('start'); }
      else if (spricht && rms < AUS) {
        if (!stilleSeit) stilleSeit = jetzt;
        if (jetzt - stilleSeit > STILLE) { spricht = false; stilleSeit = 0; if (kapitel.dataset.wer === 'du') kapitel.dataset.wer = ''; sitzung?.onSpeech?.('end'); }
      } else if (spricht) stilleSeit = 0;
      raf = requestAnimationFrame(bild);
    };
    bild();
  };

  const aufraeumen = () => {
    lauf++; // alle offenen Rückmeldungen der alten Sitzung ins Leere laufen lassen
    cancelAnimationFrame(raf); raf = null; clearInterval(uhr); uhr = null;
    timer.forEach(clearTimeout); timer = []; clearTimeout(waechter); waechter = null;
    try { sitzung?.stop?.(); } catch (e) {}
    sitzung = null; gesperrt = false;
    if (tts) speechSynthesis.cancel();
    try { ctx?.close(); } catch (e) {} ctx = null;
    stream?.getTracks().forEach(t => t.stop()); stream = null;
    pegel(0); spricht = false; kapitel.dataset.wer = '';
    delete kapitel.dataset.eigen;
    kapitel.querySelectorAll('li.eigen').forEach(li => li.remove());
    kapitel.querySelectorAll('.vd-verlauf').forEach(ol => ol.removeAttribute('aria-live'));
  };
  const zeit = s => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  const ruhe = () => { box.dataset.zustand = 'ende'; uhrEl.hidden = true; stopBtn.hidden = true; startBtn.hidden = false; window.stufen.live(kapitel, false); };
  const beende = grund => {
    const war = !!stream;
    aufraeumen(); ruhe();
    startBtn.textContent = 'Noch einmal sprechen →';
    if (war) sag(grund === 'limit' ? 'Die Demo endet nach zwei Minuten. Das Mikrofon ist wieder geschlossen.' : 'Beendet. Das Mikrofon ist wieder geschlossen.');
  };
  window.stufen.beendeLive = () => beende('user');

  const fehler = err => {
    aufraeumen(); ruhe(); box.dataset.zustand = 'fehler';
    const n = err?.name;
    if (n === 'NotAllowedError' || n === 'SecurityError') sag('Ohne Mikrofon geht es nicht. Sie können die Freigabe in der Adressleiste Ihres Browsers nachträglich erlauben, oder Sie rufen einfach an.');
    else if (n === 'NotFoundError' || n === 'OverconstrainedError') sag('Es wurde kein Mikrofon gefunden. Am Telefon geht es natürlich trotzdem.');
    else sag('Die Verbindung kam nicht zustande. Bitte noch einmal versuchen.');
  };

  startBtn.addEventListener('click', () => {
    if (!window.isSecureContext) { sag('Der Browser gibt das Mikrofon nur auf einer verschlüsselten Seite frei. Im Betrieb läuft die Seite über HTTPS, dann funktioniert die Demo.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { sag('Dieser Browser unterstützt keine Mikrofonaufnahme. Rufen Sie uns stattdessen an.'); return; }
    aufraeumen();
    const id = lauf;
    // Die Sprachausgabe muss im Klick angestoßen werden, sonst bleibt sie in Safari stumm.
    if (tts) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
    box.dataset.zustand = 'frage'; startBtn.hidden = true; stopBtn.hidden = false;
    sag('Bitte im Browser die Freigabe bestätigen.');
    navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      .then(ms => {
        if (id !== lauf) { ms.getTracks().forEach(t => t.stop()); return null; } // inzwischen beendet
        stream = ms; sag('Verbinde …');
        // Ab hier ist das Mikrofon offen: Live-Zustand, Zeitlimit und Beenden gelten sofort, auch wenn der Dienst hängt.
        window.stufen.live(kapitel, true);
        rest = LIMIT; uhrEl.hidden = false; uhrEl.textContent = zeit(rest);
        uhr = setInterval(() => { rest--; uhrEl.textContent = zeit(Math.max(0, rest)); if (rest <= 0) beende('limit'); }, 1000);
        const dienst = window.AIFOREU_VOICE;
        if (dienst) { kapitel.dataset.eigen = '1'; fall()?.querySelector('.vd-verlauf')?.setAttribute('aria-live', 'polite'); }
        const c = {
          stream,
          onAgent: t => { if (id === lauf) eigeneZeile('.vd-verlauf', 'vd-ki', t); },
          onCaller: t => { if (id === lauf) eigeneZeile('.vd-verlauf', 'vd-du', t); },
          onNote: t => { if (id === lauf) eigeneZeile('.vd-schritte', '', t); },
          onStatus: t => { if (id === lauf) sag(t); }
        };
        const verbunden = Promise.resolve((dienst || attrappe).connect(c));
        const frist = new Promise((_, nein) => setTimeout(() => nein(new Error('Zeitüberschreitung')), VERBINDEN_MAX));
        return Promise.race([verbunden, frist]).then(s => {
          if (id !== lauf) { try { s?.stop?.(); } catch (e) {} return null; } // verspätete Sitzung verwerfen
          sitzung = s || {}; if (dienst) sitzung.eigen = true;
          box.dataset.zustand = 'live';
          hoere();
          return sitzung;
        }, err => { verbunden.then(s => { try { s?.stop?.(); } catch (e) {} }, () => {}); throw err; });
      })
      .catch(err => { if (id === lauf) fehler(err); });
  });
  stopBtn.addEventListener('click', () => beende('user'));
  // Wer die Seite verlässt, lässt kein offenes Mikrofon zurück; kommt er per Zurück-Knopf wieder, ist alles in Ruhe.
  addEventListener('pagehide', () => beende('user'));
  addEventListener('pageshow', e => { if (e.persisted) { aufraeumen(); ruhe(); } });
})();
