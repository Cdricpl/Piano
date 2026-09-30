"""Fabrique des enregistrements de « piano » synthétiques (WAV + vérité terrain JSON) pour
tester l'écoute du micro : partiels légèrement inharmoniques, cordes doublées qui battent,
décroissance en deux temps, bruit du marteau, étouffoir, petite réverbération, bruit de pièce,
coupure des graves comme un micro de téléphone.

Usage : python3 outils/synthese_piano.py sortie_dossier
Produit : notes.wav, accords.wav (+ .json : [{t, midi, duree}]) — lus par outils/test_ecoute.mjs
(et par Chromium via --use-file-for-fake-audio-capture pour le test de bout en bout)."""
import sys, json, wave, os
import numpy as np

SR = 48000
rng = np.random.default_rng(7)

def note(midi, duree, vel=0.8, B=None):
    f0 = 440 * 2 ** ((midi - 69) / 12)
    n = int(SR * (duree + 3))
    t = np.arange(n) / SR
    B = B if B is not None else 0.00015 + 0.0000025 * max(0, 84 - midi) ** 1.2      # graves plus inharmoniques
    tau0 = 7 * np.exp(-f0 / 260) + 0.7
    sortie = np.zeros(n)
    bas = np.clip((260 - f0) / 200, 0, 1)                                            # 1 = grave, fondamentale faible
    for k in range(1, 23):
        fk = k * f0 * np.sqrt(1 + B * k * k)
        if fk > 9000: break
        a = k ** -0.95 * (0.75 + 0.5 * rng.random())
        if k == 1: a *= 1 - 0.6 * bas
        if k in (2, 3): a *= 1 + 0.5 * bas
        tau = tau0 / (1 + 0.55 * (k - 1))
        env = 0.6 * np.exp(-t / (tau * 0.16)) + 0.4 * np.exp(-t / tau)
        ph = rng.random() * 6.28
        cordes = 0.5 * np.sin(2 * np.pi * fk * t + ph) + 0.5 * np.sin(2 * np.pi * (fk + 0.35 + 0.3 * rng.random()) * t + ph + 1)
        sortie += a * env * cordes
    att = np.minimum(1, t / 0.004)
    etouffoir = np.where(t < duree, 1.0, np.exp(-(t - duree) / 0.09))
    marteau = rng.standard_normal(n) * np.exp(-t / 0.012) * 0.06
    y = (sortie * att * etouffoir + marteau) * vel
    return y / 6.0

def reverb(x):
    ri = rng.standard_normal(int(SR * 0.35)) * np.exp(-np.arange(int(SR * 0.35)) / (SR * 0.07))
    ri[0] = 0
    n = len(x) + len(ri)
    y = np.fft.irfft(np.fft.rfft(x, n) * np.fft.rfft(ri, n), n)[:len(x)]
    return x + 0.12 * y

def micro(x, bruit=0.0012):
    # coupure des graves (1er ordre, 90 Hz) + bruit de pièce + ronflement 50 Hz
    a = np.exp(-2 * np.pi * 90 / SR)
    y = np.zeros_like(x); px = py = 0.0
    for i in range(len(x)):                       # (un peu lent mais simple)
        py = a * (py + x[i] - px); px = x[i]; y[i] = py
    t = np.arange(len(x)) / SR
    return y + rng.standard_normal(len(x)) * bruit + 0.0008 * np.sin(2 * np.pi * 50 * t)

def piste(evenements, total, pic=0.35, bruit=0.0012):
    mix = np.zeros(int(SR * total))
    for e in evenements:
        y = note(e['midi'], e['duree'], e.get('vel', 0.8))
        i = int(SR * e['t'])
        fin = min(len(mix), i + len(y))
        mix[i:fin] += y[:fin - i]
    mix = reverb(mix)
    mix = mix / max(1e-9, np.abs(mix).max()) * pic
    return micro(mix, bruit)

def ecrire(nom, y):
    y = np.clip(y, -1, 1)
    with wave.open(nom, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype('<i2').tobytes())

def sequence(depart, liste, pas, duree):
    return [{'t': depart + i * pas, 'midi': m, 'duree': duree} for i, m in enumerate(liste)]

if __name__ == '__main__':
    dossier = sys.argv[1]; os.makedirs(dossier, exist_ok=True)
    # 1. notes seules : gamme de Do, graves, aigus, répétitions
    ev = sequence(1.0, [60, 62, 64, 65, 67, 69, 71, 72], 1.0, 0.85)
    ev += sequence(10.0, [48, 52, 55, 50, 53, 57], 1.1, 0.95)             # Do3 Mi3 Sol3 Ré3 Fa3 La3
    ev += sequence(17.0, [84, 79, 76], 1.0, 0.7)                          # Do6 Sol5 Mi5
    ev += sequence(21.0, [64, 64, 64, 64, 65, 65], 0.55, 0.45)            # répétitions rapprochées
    ev += sequence(25.0, [66, 70, 61, 73], 1.0, 0.8)                      # Fa♯4 La♯4 Do♯4 Do♯5
    json.dump(ev, open(f'{dossier}/notes.json', 'w'))
    ecrire(f'{dossier}/notes.wav', piste(ev, 30))
    # 2. accords et deux mains
    acc = []
    def accord(t, midis, d=1.3): acc.extend({'t': t, 'midi': m, 'duree': d} for m in midis)
    accord(1.0, [60, 64, 67]); accord(3.0, [53, 57, 60]); accord(5.0, [55, 59, 62])
    accord(7.0, [48, 64]); accord(9.0, [48, 60]); accord(11.0, [60, 67]); accord(13.0, [52, 59, 64, 71])
    accord(15.0, [57, 61, 64]); accord(17.0, [36 + 12, 55, 64, 72]); accord(19.0, [62, 65, 69], 0.6); accord(20.5, [62, 65, 69], 0.6)
    json.dump(acc, open(f'{dossier}/accords.json', 'w'))
    ecrire(f'{dossier}/accords.wav', piste(acc, 24))
    # 3. même chose, beaucoup plus doux (micro éloigné)
    ecrire(f'{dossier}/notes-doux.wav', piste(ev, 30, pic=0.025, bruit=0.0004))
    json.dump(ev, open(f'{dossier}/notes-doux.json', 'w'))
    # 4. pièce bruyante (conversation, ventilateur…) : bruit dix fois plus fort
    ecrire(f'{dossier}/notes-bruit.wav', piste(ev, 30, pic=0.15, bruit=0.012))
    json.dump(ev, open(f'{dossier}/notes-bruit.json', 'w'))
    # 5. gamme de Do sur un métronome à 60 : la première note tombe 4,3 s après le début (décompte de 4 temps)
    tempo = sequence(4.3, [60, 62, 64, 65, 67, 69, 71, 72], 1.0, 0.8)
    ecrire(f'{dossier}/tempo.wav', piste(tempo, 16))
    json.dump(tempo, open(f'{dossier}/tempo.json', 'w'))
    print('ok', os.listdir(dossier))
