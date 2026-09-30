"""Extrait de la police Noto Music (licence SIL OFL 1.1, © Google) les quelques symboles de
partition dessinés dans l'appli : clés de sol et de fa, altérations, têtes de notes,
soupirs, crochets. Résultat : js/glyphes.js (contours SVG, y vers le bas).

Usage : python3 outils/extraire_glyphes.py chemin/vers/NotoMusic-Regular.ttf
(pip install fonttools ; la police se télécharge sur fonts.google.com/noto/specimen/Noto+Music)"""
import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

f = TTFont(sys.argv[1]); cmap = f.getBestCmap(); gs = f.getGlyphSet()
voulus = {'sol':0x1D11E, 'fa':0x1D122, 'dieze':0x266F, 'bemol':0x266D, 'becarre':0x266E,
          'soupir':0x1D13D, 'demisoupir':0x1D13E, 'tete':0x1D158, 'tetevide':0x1D157,
          'ronde':0x1D15D, 'crochet':0x1D16E, 'crochet2':0x1D16F}
sortie = {}
for nom, cp in voulus.items():
    g = cmap[cp]
    bp = BoundsPen(gs); gs[g].draw(bp)
    pen = SVGPathPen(gs, ntos=lambda v: '%.0f' % v)
    gs[g].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))          # y vers le bas
    x0, y0, x1, y1 = bp.bounds
    sortie[nom] = {'d':pen.getCommands(), 'x0':x0, 'x1':x1, 'y0':-y1, 'y1':-y0}
corps = json.dumps(sortie, separators=(',', ':'))
open('js/glyphes.js', 'w').write(
"""/* Contours des symboles de partition, extraits de la police Noto Music (SIL OFL 1.1,
 * © The Noto Project Authors) par outils/extraire_glyphes.py. Unités : 1000 = un corps,
 * une « interligne » de portée valant 250. y vers le bas. Ne pas modifier à la main. */
export const GLYPHES = """ + corps + ";\n")
print('js/glyphes.js', len(corps), 'octets')
