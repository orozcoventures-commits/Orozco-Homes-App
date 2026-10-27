"""
Orozco Homes — Welcome & Capabilities Package (client-facing PDF).

All wording, services and values come from the Orozco Homes Design-Build
Portal: the Project Proposal ("The Orozco Homes Difference"), the
Pre-Consultation Questionnaire, the Construction Agreement, the client portal,
the Subcontractor Standards and the Remodel Estimates project types.

The PDF is served by the app at /orozco-homes-welcome-package.pdf (Sales →
Proposals → "Welcome Package (PDF)"). After changing the text below, rebuild it
from the repository root and commit the new PDF:
    pip install reportlab
    python tools/welcome-package/build_welcome_pdf.py
"""

import argparse
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    BaseDocTemplate, Frame, Image, KeepTogether, NextPageTemplate, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

# ── Brand (from the app) ─────────────────────────────────────────────────────
NAVY = colors.HexColor('#002147')
NAVY_2 = colors.HexColor('#003166')
GOLD = colors.HexColor('#D4AF37')
GOLD_SOFT = colors.HexColor('#F6EFD6')
CREAM = colors.HexColor('#F5F4F0')
INK = colors.HexColor('#1F2937')
BODY = colors.HexColor('#374151')
MUTED = colors.HexColor('#6B7280')
LINE = colors.HexColor('#E8E6E1')

COMPANY = {
    'name': 'Orozco Homes',
    'tagline': 'Design & Construction · Virginia Beach, VA',
    'rep': 'Mary-Blake Orozco',
    'title': 'Owner',
    'license': 'Licensed & Insured Class A Contractor',
    'phone': '757-513-2593',
    'email': 'mborozco@orozcohomes.com',
}

PAGE_W, PAGE_H = letter
MARGIN = 0.8 * inch

# ── Styles ───────────────────────────────────────────────────────────────────
def S(name, **kw):
    base = dict(fontName='Helvetica', fontSize=10.5, leading=15.5, textColor=BODY)
    base.update(kw)
    return ParagraphStyle(name, **base)

EYEBROW = S('eyebrow', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=GOLD, spaceAfter=4)
H1 = S('h1', fontName='Helvetica-Bold', fontSize=24, leading=29, textColor=NAVY, spaceAfter=8)
H2 = S('h2', fontName='Helvetica-Bold', fontSize=13.5, leading=18, textColor=NAVY, spaceBefore=12, spaceAfter=6)
LEAD = S('lead', fontSize=12, leading=18, textColor=INK, spaceAfter=10)
BODY_P = S('body', spaceAfter=7)
SMALL = S('small', fontSize=9, leading=13, textColor=MUTED)
QUOTE = S('quote', fontName='Helvetica-Oblique', fontSize=13, leading=19.5, textColor=NAVY, alignment=TA_LEFT)
CELL = S('cell', fontSize=9.4, leading=13.2)
CELL_S = S('cells', fontSize=9.1, leading=12.4)
CELL_B = S('cellb', fontName='Helvetica-Bold', fontSize=9.6, leading=13.2, textColor=NAVY)
CELL_H = S('cellh', fontName='Helvetica-Bold', fontSize=8, leading=10, textColor=colors.white)
CARD_T = S('cardt', fontName='Helvetica-Bold', fontSize=11, leading=14.5, textColor=NAVY, spaceAfter=3)
CARD_P = S('cardp', fontSize=9.4, leading=13.6)
STEP_N = S('stepn', fontName='Helvetica-Bold', fontSize=15, leading=18, textColor=GOLD, alignment=TA_CENTER)


def bullet(text, style=BODY_P):
    return Paragraph(text, style, bulletText='•')


def section_head(eyebrow, title):
    return [Paragraph(eyebrow.upper(), EYEBROW), Paragraph(title, H1),
            Table([['']], colWidths=[1.1 * inch], rowHeights=[3],
                  style=[('BACKGROUND', (0, 0), (-1, -1), GOLD)], hAlign='LEFT'),
            Spacer(1, 12)]


def card_grid(cards, cols=2, gap=10):
    """White cards with a gold top rule, `cols` per row: [(title, text), ...]."""
    width = PAGE_W - 2 * MARGIN
    col_w = (width - gap * (cols - 1)) / cols
    widths = []
    for i in range(cols):
        widths += [col_w] + ([gap] if i < cols - 1 else [])
    out = []
    for start in range(0, len(cards), cols):
        chunk = cards[start:start + cols]
        row, style = [], [('VALIGN', (0, 0), (-1, -1), 'TOP'),
                          ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
                          ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12)]
        for i in range(cols):
            if i < len(chunk):
                title, text = chunk[i]
                row.append([Paragraph(title, CARD_T), Paragraph(text, CARD_P)])
                c = i * 2
                style += [('BACKGROUND', (c, 0), (c, 0), colors.white), ('BOX', (c, 0), (c, 0), 0.8, LINE),
                          ('LINEABOVE', (c, 0), (c, 0), 2.5, GOLD)]
            else:
                row.append('')
            if i < cols - 1:
                row.append('')
        out += [Table([row], colWidths=widths, hAlign='LEFT', style=TableStyle(style)), Spacer(1, gap)]
    return out


def services_table(rows):
    """rows: [(service, what's included)]"""
    width = PAGE_W - 2 * MARGIN
    data = [[Paragraph('SERVICE', CELL_H), Paragraph('WHAT IS TYPICALLY INCLUDED', CELL_H)]]
    data += [[Paragraph(s, CELL_B), Paragraph(d, CELL_S)] for s, d in rows]
    t = Table(data, colWidths=[2.05 * inch, width - 2.05 * inch], repeatRows=1, hAlign='LEFT')
    st = [('BACKGROUND', (0, 0), (-1, 0), NAVY),
          ('VALIGN', (0, 0), (-1, -1), 'TOP'),
          ('TOPPADDING', (0, 0), (-1, -1), 4.5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5.5),
          ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
          ('LINEBELOW', (0, 1), (-1, -1), 0.5, LINE),
          ('BOX', (0, 0), (-1, -1), 0.8, LINE)]
    for i in range(1, len(data)):
        st.append(('BACKGROUND', (0, i), (-1, i), colors.white if i % 2 else colors.HexColor('#FBFAF7')))
    t.setStyle(TableStyle(st))
    return t


def group_title(text):
    return Paragraph(text, S('gt', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=NAVY,
                             spaceBefore=9, spaceAfter=5, keepWithNext=1))


# ── Page decoration ──────────────────────────────────────────────────────────
class Doc(BaseDocTemplate):
    def __init__(self, filename, logo=None, **kw):
        super().__init__(filename, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN,
                         topMargin=0.95 * inch, bottomMargin=0.85 * inch,
                         title='Welcome & Capabilities Package — Orozco Homes',
                         author=COMPANY['name'], subject='Welcome & Capabilities Package', **kw)
        self.logo = logo
        cover = Frame(0, 0, PAGE_W, PAGE_H, id='cover', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        body = Frame(MARGIN, 0.85 * inch, PAGE_W - 2 * MARGIN, PAGE_H - 1.8 * inch, id='body')
        self.addPageTemplates([
            PageTemplate(id='Cover', frames=[cover], onPage=self.draw_cover),
            PageTemplate(id='Body', frames=[body], onPage=self.draw_body),
        ])

    def draw_cover(self, c, _doc):
        c.saveState()
        c.setFillColor(NAVY)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # soft accent bands
        c.setFillColor(NAVY_2)
        c.rect(0, PAGE_H * 0.36, PAGE_W, 1.5 * inch, stroke=0, fill=1)
        c.setFillColor(GOLD)
        c.rect(0, PAGE_H - 0.18 * inch, PAGE_W, 0.18 * inch, stroke=0, fill=1)
        c.rect(0, 0, PAGE_W, 0.12 * inch, stroke=0, fill=1)

        y = PAGE_H - 2.2 * inch
        if self.logo and os.path.exists(self.logo):
            w = 1.9 * inch
            h = w * 115 / 167
            c.drawImage(self.logo, (PAGE_W - w) / 2, y - h + 0.4 * inch, width=w, height=h, mask='auto')
        c.setFillColor(GOLD)
        c.setFont('Helvetica-Bold', 9.5)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.36 + 1.05 * inch, 'WELCOME & CAPABILITIES PACKAGE')
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 30)
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.36 + 0.55 * inch, 'Welcome to Orozco Homes')
        c.setFont('Helvetica', 12)
        c.setFillColor(colors.HexColor('#C9D3E0'))
        c.drawCentredString(PAGE_W / 2, PAGE_H * 0.36 + 0.22 * inch, 'A full-service, design-build remodeling experience')

        c.setStrokeColor(GOLD)
        c.setLineWidth(1.2)
        c.line(PAGE_W / 2 - 0.6 * inch, PAGE_H * 0.36 - 0.35 * inch, PAGE_W / 2 + 0.6 * inch, PAGE_H * 0.36 - 0.35 * inch)

        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 11)
        c.drawCentredString(PAGE_W / 2, 2.05 * inch, f"{COMPANY['rep']}, {COMPANY['title']}")
        c.setFont('Helvetica', 10)
        c.setFillColor(colors.HexColor('#C9D3E0'))
        c.drawCentredString(PAGE_W / 2, 1.8 * inch, f"{COMPANY['phone']}   ·   {COMPANY['email']}")
        c.drawCentredString(PAGE_W / 2, 1.57 * inch, COMPANY['license'])
        c.setFillColor(GOLD)
        c.setFont('Helvetica-Bold', 8.5)
        c.drawCentredString(PAGE_W / 2, 1.0 * inch, COMPANY['tagline'].upper())
        c.restoreState()

    def draw_body(self, c, doc):
        c.saveState()
        c.setFillColor(CREAM)
        c.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
        # header
        c.setFillColor(NAVY)
        c.rect(0, PAGE_H - 0.55 * inch, PAGE_W, 0.55 * inch, stroke=0, fill=1)
        c.setFillColor(GOLD)
        c.rect(0, PAGE_H - 0.6 * inch, PAGE_W, 0.05 * inch, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 11)
        c.drawString(MARGIN, PAGE_H - 0.35 * inch, COMPANY['name'])
        c.setFont('Helvetica', 8)
        c.setFillColor(colors.HexColor('#C9D3E0'))
        c.drawRightString(PAGE_W - MARGIN, PAGE_H - 0.35 * inch, 'WELCOME & CAPABILITIES PACKAGE')
        # footer
        c.setStrokeColor(LINE)
        c.setLineWidth(0.6)
        c.line(MARGIN, 0.6 * inch, PAGE_W - MARGIN, 0.6 * inch)
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 7.8)
        c.drawString(MARGIN, 0.42 * inch,
                     f"{COMPANY['name']} · {COMPANY['tagline']} · {COMPANY['phone']} · {COMPANY['email']}")
        c.drawRightString(PAGE_W - MARGIN, 0.42 * inch, str(doc.page))
        c.restoreState()


# ── Content (from the app) ───────────────────────────────────────────────────
def quote_box(text):
    return Table([[Paragraph(text, QUOTE)]], colWidths=[PAGE_W - 2 * MARGIN],
                 style=[('BACKGROUND', (0, 0), (-1, -1), colors.white),
                        ('LINEBEFORE', (0, 0), (0, -1), 4, GOLD),
                        ('LEFTPADDING', (0, 0), (-1, -1), 18), ('RIGHTPADDING', (0, 0), (-1, -1), 18),
                        ('TOPPADDING', (0, 0), (-1, -1), 14), ('BOTTOMPADDING', (0, 0), (-1, -1), 14)])


def promise_rows(promises):
    """Full-width numbered promises: [(title, text), ...]."""
    width = PAGE_W - 2 * MARGIN
    out = []
    for i, (t, d) in enumerate(promises, 1):
        out += [Table([[Paragraph(str(i), STEP_N), [Paragraph(t, CARD_T), Paragraph(d, CARD_P)]]],
                      colWidths=[0.55 * inch, width - 0.55 * inch], hAlign='LEFT',
                      style=[('VALIGN', (0, 0), (-1, -1), 'TOP'), ('BACKGROUND', (0, 0), (0, 0), NAVY),
                             ('BACKGROUND', (1, 0), (1, 0), colors.white), ('BOX', (1, 0), (1, 0), 0.8, LINE),
                             ('TOPPADDING', (0, 0), (-1, -1), 10), ('BOTTOMPADDING', (0, 0), (-1, -1), 11),
                             ('LEFTPADDING', (1, 0), (1, 0), 14), ('RIGHTPADDING', (1, 0), (1, 0), 14)]),
                Spacer(1, 8)]
    return out


def promise_and_values():
    # Our Promise to You (owner's text, aligned with the Proposal and Construction Agreement).
    f = section_head('Our Promise to You', 'What it means to experience a stress-free remodel')
    f += [
        quote_box('“A home remodel should transform your life, not disrupt your sanity.”'),
        Spacer(1, 12),
        Paragraph('We believe that a beautiful home should not come at the cost of your peace of mind. Most homeowners '
                  'dread remodeling because of scheduling chaos, hidden surprises and poor communication. We started our '
                  'company to change that. When you partner with us, we take full responsibility for your entire project, '
                  'from the initial sketch to the final sweep. Here is exactly what you can expect when you trust us with '
                  'your home.', LEAD),
        Spacer(1, 4),
    ]
    f += promise_rows([
        ('One Hand to Shake — Complete Project Accountability',
         'You will never have to manage multiple contractors, track down material deliveries or resolve disputes between '
         'designers, architects and builders. We design the project, guide and source your finishes, coordinate licensed '
         'and insured trades and the permits, and manage the build timeline. If an issue arises, it is our job to solve '
         'it, and we keep you informed along the way.'),
        ('Proactive Communication — No “Black Boxes”',
         'You will never have to text us asking, “What is happening next week?” We believe that certainty eliminates '
         'anxiety. You will receive regular progress updates in your project portal, showing the current phase, what '
         'was completed and what is coming next, and we let you know right away about any adjustments.'),
        ('Respect for Your Sanctuary',
         'We never forget that your project site is first and foremost your home. Our trade partners sign our written '
         'Code of Conduct, which safeguards your comfort and respects your neighbors: daily site cleanup, strict dust '
         'containment, careful protection of your finishes and non-remodeled living spaces, and strict boundaries, so '
         'workers never use your bathrooms, kitchen or living areas.'),
    ])
    # What We Stand For: mission + the values not already covered by the promises.
    f += [PageBreak()] + section_head('1 · What We Stand For', 'Our mission')
    f += [quote_box('“Our goal is to manage the entire remodeling and building process for your space so you can '
                    'enjoy creating your home without having to become your own designer, purchaser, scheduler '
                    'and general contractor.”'),
          Spacer(1, 10),
          Paragraph('A successful remodel involves much more than construction. It requires hundreds of decisions, '
                    'multiple specialized trades, material procurement, scheduling, design coordination, inspections, '
                    'problem-solving and quality control. Orozco Homes provides a full-service, design-build remodeling '
                    'experience designed to take that responsibility off the homeowner.', BODY_P),
          Paragraph('Our philosophy', H2)]
    f += card_grid([
        ('Collaboration with you',
         'We work collaboratively with you to develop the layouts, establish the design direction and guide '
         'material, fixture, finish and color selections, creating spaces that reflect your priorities.'),
        ('Beauty that lasts',
         'Every design balances aesthetics, functionality, constructability and long-term durability. Wet areas '
         'are properly waterproofed using professional installation methods and industry best practices.'),
        ('Transparency',
         'We align scope and selections with your desired investment level while maintaining transparency '
         'throughout, from preliminary estimate to final construction agreement.'),
        ('Built to code',
         'All applicable work is completed in accordance with local building codes, manufacturer requirements '
         'and professional construction standards, with required permits and inspections coordinated by us.'),
    ])
    return f


def differentiators():
    f = [PageBreak()] + section_head('2 · What Differentiates Us', 'More than a contractor')
    f += [Paragraph('Our team manages every part of your remodel, so you have one partner instead of a long list of '
                    'vendors, trades and schedules to coordinate.', LEAD)]
    managed = [
        ('Client Communication', 'A clear point of contact throughout design, planning and construction.'),
        ('Design & Space Planning', 'Layouts that balance beauty, functionality and the existing structure of your home.'),
        ('Professional Design Guidance', 'Our designer guides cabinetry, tile, plumbing fixtures, lighting, carpentry, finishes and other selections.'),
        ('Trade Coordination', 'Expert plumbers, electricians, carpenters, tile installers, painters, HVAC professionals and other specialized trades.'),
        ('Architectural & Engineering Coordination', 'Architects, engineers and other professionals when required by the project.'),
        ('Permitting & Inspections', 'Required permits, inspections and applicable construction requirements.'),
        ('Material Procurement', 'We order and coordinate materials, so you do not manage vendors, deliveries and specifications.'),
        ('Project Scheduling', 'Trades and materials sequenced to keep construction moving efficiently.'),
        ('Construction Management', 'From demolition through completion, including the day-to-day decisions that arise.'),
        ('Quality Control', 'Workmanship and installation reviewed throughout, with corrections coordinated when necessary.'),
    ]
    width = PAGE_W - 2 * MARGIN
    data = [[Paragraph('WE MANAGE', CELL_H), Paragraph('WHAT IT MEANS FOR YOU', CELL_H)]]
    data += [[Paragraph(a, CELL_B), Paragraph(b, CELL)] for a, b in managed]
    t = Table(data, colWidths=[2.35 * inch, width - 2.35 * inch], repeatRows=1, hAlign='LEFT')
    st = [('BACKGROUND', (0, 0), (-1, 0), NAVY), ('VALIGN', (0, 0), (-1, -1), 'TOP'),
          ('TOPPADDING', (0, 0), (-1, -1), 6), ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
          ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
          ('LINEBELOW', (0, 1), (-1, -1), 0.5, LINE), ('BOX', (0, 0), (-1, -1), 0.8, LINE)]
    for i in range(1, len(data)):
        st.append(('BACKGROUND', (0, i), (-1, i), colors.white if i % 2 else colors.HexColor('#FBFAF7')))
    t.setStyle(TableStyle(st))
    f += [t, Spacer(1, 6), PageBreak(), Paragraph('How we work differently', H2)]
    f += card_grid([
        ('Plan first, then build',
         'No demolition or construction begins until all major selections are finalized and documented, to ensure '
         'efficiency, cost control and a seamless build process.'),
        ('Clear, local pricing',
         'Estimates are built line by line from current Virginia Beach / Hampton Roads labor and material pricing. '
         'Your proposal lists the allowances included for the products you select.'),
        ('Allowances you can track',
         'Each selection is compared with its allowance. If a selection costs more, the difference is added by '
         'change order; if it costs less, it is credited.'),
        ('Nothing changes without your approval',
         'Extra or changed work is documented as a change order that you review and approve before it is added '
         'to your project.'),
        ('Your own project portal',
         'One place for your project: phases and progress updates, a progress photo gallery, design selections '
         'to approve, messages, and proposals and agreements to review and sign electronically.'),
        ('Trade partners held to our standards',
         'Our trade partners are required to keep a current certificate of insurance and the required Virginia '
         'licenses, and to sign our written Subcontractor Standards and a Scope of Work for your job before starting.'),
        ('Workmanship warranty',
         'Our Construction Agreement includes a workmanship warranty: 12 months from substantial completion unless '
         'your agreement states otherwise. Manufacturer warranties on materials and fixtures are passed through to you.'),
        ('Honest about remodeling',
         'Existing homes can hide water damage, prior installations or outdated systems. We work to identify risks '
         'early and explain any verified unforeseen condition before work continues.'),
    ])
    return f


def services():
    f = [PageBreak()] + section_head('3 · Our Remodeling Services', 'What we build')
    f += [Paragraph('Every project is priced and planned from our detailed remodeling scopes for the Virginia Beach and '
                    'Hampton Roads area. Typical work for each service is listed below; your final scope is confirmed '
                    'during design and planning.', LEAD)]
    every = Table([[Paragraph('<b>Every project starts with a design consultation and selections.</b> Where the work requires '
                              'them, we also provide permit plans, building permits and inspections, engineering, site '
                              'protection and dust barriers, and debris removal, and our trades clean the work area daily.',
                              S('ev', fontSize=9.6, leading=14, textColor=NAVY))]],
                  colWidths=[PAGE_W - 2 * MARGIN],
                  style=[('BACKGROUND', (0, 0), (-1, -1), GOLD_SOFT), ('BOX', (0, 0), (-1, -1), 0.8, GOLD),
                         ('LEFTPADDING', (0, 0), (-1, -1), 12), ('RIGHTPADDING', (0, 0), (-1, -1), 12),
                         ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)])
    f += [every]
    groups = [
        ('Bathrooms', [
            ('Bathroom Remodel (small, medium & large)', 'Demolition, plumbing and electrical rough-in, waterproofing, floor and wall tile, shower pan and glass enclosure, vanity and sink, toilet, tub (medium and large baths), faucets and trim, lighting, mirror or medicine cabinet, accessories, paint and trim. Custom millwork for larger baths.'),
            ('Add a Shower', 'Shower framing and blocking, new drain and vent tie-in, valve rough-in, shower pan and waterproofing, wall tile, glass door or enclosure, trim kit and head, exhaust fan, GFCI and light.'),
            ('Tub-to-Shower Conversion', 'Tub removal, valve relocation and drain conversion, shower pan and waterproofing, wall tile, glass door or enclosure, trim kit and head.'),
            ('Bathroom Refresh', 'New vanity and top, faucet, toilet, mirror or medicine cabinet, lighting and accessories, with hookups in the same locations (no tile or plumbing moves).'),
            ('Aging-in-Place / Accessible Bath', 'Curbless shower with waterproofing, non-slip floor tile, widened 36" doorway, grab bars with blocking, comfort-height toilet, accessible vanity, handheld shower.'),
            ('Second Vanity / Double Sink', 'Double vanity cabinet, countertop with two sinks, two faucets, plumbing branch for the second sink, lighting and mirrors.'),
        ]),
        ('Kitchens', [
            ('Kitchen Remodel (small, medium & large)', 'Lower and upper cabinets, quartz or granite countertops, backsplash tile, island (medium and large), range or cooktop with hood, refrigerator, dishwasher, microwave, sink and faucet, flooring, lighting, plumbing and electrical rough-in, paint. Custom millwork for larger kitchens.'),
            ('Kitchen Refresh', 'Cabinet painting (doors and boxes), new hardware, new countertops and backsplash tile, sink and faucet, under-cabinet lighting and wall paint.'),
            ('Kitchen Island Addition', 'Island cabinets and countertop, island outlets and circuit, pendant lights, flooring patch.'),
        ]),
        ('Additions & Major Projects', [
            ('Home Addition', 'Structural engineering, footings and slab, framing and sheathing, roofing, siding, windows and exterior door, electrical, plumbing and HVAC, insulation, drywall, flooring, trim and paint.'),
            ('Portico (Covered Entry)', 'Footings, structural columns, beam and header work, roof framing and roofing, soffit and fascia, paver, slate or brick entry floor, exterior lighting and paint.'),
            ('Garage Conversion', 'Slab repair and leveling, garage door infill, new window and door, electrical upgrade, HVAC mini-split, insulation and drywall, flooring, trim, paint and lighting; plumbing if a bath is added.'),
            ('Attic Conversion', 'Joist reinforcement and subfloor, staircase to code, egress window, spray foam insulation at the roofline, HVAC mini-split, electrical, drywall, flooring, lighting, paint and trim.'),
            ('Full House Renovation', 'Structural repairs, plumbing, electrical and HVAC replacement, roof, windows and siding, insulation and drywall, kitchen and bathrooms, flooring, trim, doors and paint.'),
        ]),
        ('Interior Renovations', [
            ('Wall Removal / Open Concept', 'Wall removal, beam and temporary shoring for load-bearing walls, relocation of switches, outlets and lights, drywall and ceiling patch, flooring patch and paint.'),
            ('Fireplace Removal + Built-In', 'Fireplace and hearth removal, framing infill, chimney cap and roof patch, built-in cabinets and shelving with lighting.'),
            ('Flooring Replacement', 'Removal of old flooring, subfloor prep and leveling, LVP or hardwood, transitions and baseboard.'),
            ('Interior Painting & Popcorn Ceiling Removal', 'Protection and masking, popcorn ceiling removal with testing, skim coat, walls, ceilings and trim.'),
            ('Trim & Molding', 'Baseboard, crown molding, door and window casing, accent walls and wainscoting, caulk and paint.'),
            ('Laundry Room / Mudroom', 'Cabinets and countertop, utility sink and washer box, dryer circuit and lighting, bench, hooks and cubbies, flooring.'),
            ('Closets, Home Office & Built-Ins', 'Custom shelving and rods, drawers, desk, cabinets and shelving, outlets, data lines and lighting.'),
            ('Staircase Remodel', 'Treads and risers, railing and balusters, newel posts, stain or paint.'),
        ]),
        ('Exterior & Outdoor', [
            ('Deck (New or Rebuild)', 'Footings and posts, pressure-treated framing, decking (pressure-treated or composite), railing and stairs.'),
            ('Screened Porch Conversion', 'Screen framing system and screen door, ceiling fan and lighting, beadboard ceiling, flooring or deck coating, paint or stain.'),
            ('Windows, Exterior & Patio Doors', 'Removal of old units, installation with flashing, sill pans and insulation, hardware and lockset, interior and exterior trim and paint.'),
            ('Siding Repair / Replacement', 'Removal of old siding, sheathing repair, housewrap and flashing, vinyl or fiber cement siding, trim, corners and soffit.'),
        ]),
        ('Repairs & Building Health', [
            ('Crawlspace Encapsulation', 'Vapor barrier on walls and floor, sealed vents and rim joists, insulation, dehumidifier and sealed access door.'),
            ('Water Damage / Mold Repair', 'Removal of damaged materials, drying and dehumidification, mold treatment, framing and subfloor repair, drywall, flooring and paint.'),
        ]),
    ]
    # One table per group; the header row repeats only if a table continues on the next page.
    for title, rows in groups:
        f += [group_title(title), services_table(rows)]
    return f


def process():
    f = [PageBreak()] + section_head('Working Together', 'The seamless journey ahead')
    phases = [
        ('Phase 1 · Precision Planning',
         'We finalize every detail, drawing and fixture choice before construction begins, so your Construction '
         'Agreement is built on a finished plan.',
         [('Pre-Consultation Questionnaire', 'You share your project, your vision and your goals so we can prepare for our first meeting and make sure we are the right fit.'),
          ('Consultation & Site Visit', 'We visit your home, listen to your priorities and review existing conditions.'),
          ('Project Proposal', 'You receive a Project Proposal with a preliminary scope, estimated timeline and estimated investment range, which you can review and sign online.'),
          ('Design & Selections', 'With our designer, we develop the layout and guide your selections. You approve each selection in your project portal and can compare it with its allowance. No demolition begins until all major selections are finalized and documented.'),
          ('Construction Agreement', 'Once scope, selections and pricing are final, you receive a Construction Agreement with the timeline, total investment and payment schedule, and a confirmed start date.')]),
        ('Phase 2 · Secure Sourcing',
         'We order and coordinate your materials so you never manage vendors, deliveries or specifications.',
         [('Materials Ordered & Tracked', 'Materials are ordered, tracked and scheduled with the trades, to keep construction moving efficiently.')]),
        ('Phase 3 · Managed Build',
         'Our licensed, insured trade partners handle the physical transformation, coordinated by your Orozco Homes point of contact.',
         [('Construction', 'We manage every trade from demolition through completion. Follow each phase with progress updates and photos in your portal.'),
          ('Changes, in Writing', 'If something changes or a concealed condition is found, it is documented as a change order that you review and approve before it is added.')]),
        ('Phase 4 · Flawless Handover',
         'Final cleaning and thorough quality checks, presenting your newly reimagined home as you envisioned it.',
         [('Completion & Warranty', 'Punch list and closeout, backed by our workmanship warranty and the manufacturers’ warranties.')]),
    ]
    width = PAGE_W - 2 * MARGIN
    PH_T = S('pht', fontName='Helvetica-Bold', fontSize=12, leading=15, textColor=NAVY)
    PH_D = S('phd', fontSize=9.4, leading=13.4, textColor=MUTED)
    n = 0
    for title, blurb, steps in phases:
        block = [Spacer(1, 6), Paragraph(title, PH_T), Paragraph(blurb, PH_D), Spacer(1, 6)]
        rows = []
        for t, d in steps:
            n += 1
            rows.append([Paragraph(str(n), STEP_N), [Paragraph(t, CARD_T), Paragraph(d, CARD_P)]])
        tbl = Table(rows, colWidths=[0.55 * inch, width - 0.55 * inch], hAlign='LEFT')
        tbl.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'),
                                 ('BACKGROUND', (0, 0), (0, -1), NAVY),
                                 ('BACKGROUND', (1, 0), (1, -1), colors.white),
                                 ('LINEBELOW', (0, 0), (-1, -2), 4, CREAM),
                                 ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
                                 ('LEFTPADDING', (1, 0), (1, -1), 14), ('RIGHTPADDING', (1, 0), (1, -1), 14)]))
        f += [KeepTogether(block + [tbl])]
    f += [Spacer(1, 16)]
    contact = Table([[
        [Paragraph('Let’s create your home together', S('ct', fontName='Helvetica-Bold', fontSize=14, leading=18, textColor=colors.white, spaceAfter=6)),
         Paragraph(f"{COMPANY['rep']}, {COMPANY['title']}", S('cn', fontName='Helvetica-Bold', fontSize=10.5, leading=15, textColor=GOLD)),
         Paragraph(f"{COMPANY['phone']} &nbsp;·&nbsp; {COMPANY['email']}", S('cc', fontSize=10, leading=15, textColor=colors.white)),
         Paragraph(f"{COMPANY['license']} &nbsp;·&nbsp; {COMPANY['tagline']}", S('cl', fontSize=9, leading=14, textColor=colors.HexColor('#C9D3E0')))],
    ]], colWidths=[width], style=[('BACKGROUND', (0, 0), (-1, -1), NAVY),
                                  ('LINEABOVE', (0, 0), (-1, 0), 3, GOLD),
                                  ('LEFTPADDING', (0, 0), (-1, -1), 18), ('RIGHTPADDING', (0, 0), (-1, -1), 18),
                                  ('TOPPADDING', (0, 0), (-1, -1), 14), ('BOTTOMPADDING', (0, 0), (-1, -1), 16)])
    f += [KeepTogether([contact])]
    return f


def build(out, logo):
    doc = Doc(out, logo=logo)
    story = [NextPageTemplate('Body'), PageBreak()]
    story += promise_and_values()
    story += differentiators()
    story += services()
    story += process()
    doc.build(story)
    return out


if __name__ == '__main__':
    public = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public')
    ap = argparse.ArgumentParser(description='Build the Orozco Homes Welcome & Capabilities Package PDF.')
    ap.add_argument('--logo', default=os.path.join(public, 'orozco-homes-logo.png'))
    ap.add_argument('--out', default=os.path.join(public, 'orozco-homes-welcome-package.pdf'))
    a = ap.parse_args()
    print('Saved', build(a.out, a.logo))
