from io import BytesIO
from pathlib import Path
from datetime import date, datetime
import re
from xml.sax.saxutils import escape

import reportlab
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import LongTable, Paragraph, SimpleDocTemplate, Spacer, TableStyle


GOLD = colors.HexColor("#d9a75e")
DARK = colors.HexColor("#20242c")
MUTED = colors.HexColor("#606a78")
MAX_DETAIL_ROWS = 200
MAX_LABEL_LENGTH = 240
MAX_CATEGORIES_PER_CHART = 20


def _format_date_label(value):
    if not isinstance(value, str):
        return value
    try:
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
            parsed_date = date.fromisoformat(value)
            return parsed_date.strftime("%d/%m/%Y")
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}[ T].+", value):
            parsed_datetime = datetime.fromisoformat(value.replace("Z", "+00:00"))
            display_date = parsed_datetime.date().strftime("%d/%m/%Y")
            hour = parsed_datetime.hour % 12 or 12
            period = "AM" if parsed_datetime.hour < 12 else "PM"
            display_time = f"{hour}:{parsed_datetime.minute:02d} {period}"
            offset = parsed_datetime.strftime("%z")
            if offset:
                offset = f" UTC{offset[:3]}:{offset[3:]}"
            return f"{display_date}, {display_time}{offset}"
    except ValueError:
        pass
    return value


def _register_report_fonts():
    """Prefer ReportLab's bundled Vera TTF; escape unsupported glyphs if needed."""
    regular_name = "DataLensVera"
    bold_name = "DataLensVera-Bold"
    if regular_name not in pdfmetrics.getRegisteredFontNames():
        font_dir = Path(reportlab.__file__).resolve().parent / "fonts"
        regular_path = font_dir / "Vera.ttf"
        bold_path = font_dir / "VeraBd.ttf"
        if regular_path.is_file() and bold_path.is_file():
            pdfmetrics.registerFont(TTFont(regular_name, str(regular_path)))
            pdfmetrics.registerFont(TTFont(bold_name, str(bold_path)))
            pdfmetrics.registerFontFamily(regular_name, normal=regular_name, bold=bold_name, italic=regular_name, boldItalic=bold_name)
            face = pdfmetrics.getFont(regular_name).face
            return regular_name, bold_name, face.charWidths

    # ReportLab's built-in Helvetica is a last-resort fallback with WinAnsi coverage.
    return "Helvetica", "Helvetica-Bold", set(range(32, 127))


def _display_text(value, supported_codepoints, truncated_count):
    text = str(value)
    if len(text) > MAX_LABEL_LENGTH:
        text = f"{text[:MAX_LABEL_LENGTH - 1]}…"
        truncated_count[0] += 1
    return "".join(
        char if ord(char) in supported_codepoints else f"\\u{ord(char):04X}"
        for char in text
    )


def _paragraph(value, style, supported_codepoints, truncated_count):
    safe_text = _display_text(value, supported_codepoints, truncated_count)
    return Paragraph(escape(safe_text), style)


def _table(rows, widths, regular_font, bold_font, supported_codepoints, truncated_count):
    cell_style = ParagraphStyle(
        "DataLensTableCell",
        fontName=regular_font,
        fontSize=7.5,
        leading=9.5,
        splitLongWords=1,
        wordWrap="CJK",
    )
    header_style = ParagraphStyle(
        "DataLensTableHeader",
        parent=cell_style,
        fontName=bold_font,
        textColor=colors.white,
    )
    paragraph_rows = []
    for row_index, row in enumerate(rows):
        style = header_style if row_index == 0 else cell_style
        paragraph_rows.append([
            _paragraph(value, style, supported_codepoints, truncated_count)
            for value in row
        ])

    table = LongTable(
        paragraph_rows,
        colWidths=widths,
        repeatRows=1,
        splitByRow=1,
        hAlign="LEFT",
    )
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("BACKGROUND", (0, 1), (-1, -1), colors.HexColor("#f5f6f8")),
        ("TEXTCOLOR", (0, 1), (-1, -1), DARK),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#d6dae0")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return table


def _category_chart(chart, regular_font, supported_codepoints, truncated_count):
    entries = chart.get("values") or []
    if not entries:
        return None
    drawing = Drawing(460, 205)
    graph = VerticalBarChart()
    graph.x = 52
    graph.y = 38
    graph.width = 385
    graph.height = 145
    graph.data = [[max(0, float(item.get("value", 0))) for item in entries]]
    graph.categoryAxis.categoryNames = [
        _display_text(_format_date_label(item.get("label", "")), supported_codepoints, truncated_count)
        for item in entries
    ]
    graph.categoryAxis.labels.fontName = regular_font
    graph.categoryAxis.labels.fontSize = 7
    graph.categoryAxis.labels.angle = 25
    graph.valueAxis.valueMin = 0
    graph.valueAxis.valueStep = max(1, int(max(graph.data[0]) / 5) or 1)
    graph.valueAxis.labels.fontName = regular_font
    graph.valueAxis.labels.fontSize = 8
    graph.bars[0].fillColor = GOLD
    graph.bars[0].strokeColor = GOLD
    drawing.add(graph)
    return drawing


def build_dataset_report(dataset):
    """Build a bounded PDF using only analysis values already stored for the dataset."""
    regular_font, bold_font, supported_codepoints = _register_report_fonts()
    truncated_count = [0]
    buffer = BytesIO()
    document = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.65 * inch,
        leftMargin=0.65 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.65 * inch,
        title="DataLens Dataset Report",
        author="DataLens",
    )
    base = getSampleStyleSheet()
    title_style = ParagraphStyle("DataLensTitle", parent=base["Title"], fontName=bold_font, textColor=DARK, alignment=TA_LEFT, fontSize=21, leading=25, spaceAfter=6, splitLongWords=1)
    section_style = ParagraphStyle("DataLensSection", parent=base["Heading2"], fontName=bold_font, textColor=DARK, fontSize=13, leading=16, spaceBefore=13, spaceAfter=7)
    note_style = ParagraphStyle("DataLensNote", parent=base["BodyText"], fontName=regular_font, textColor=MUTED, fontSize=8, leading=11, splitLongWords=1)
    cell_style = ParagraphStyle("DataLensCell", parent=base["BodyText"], fontName=regular_font, fontSize=8, leading=10, splitLongWords=1, wordWrap="CJK")

    def report_table(rows, widths):
        return _table(rows, widths, regular_font, bold_font, supported_codepoints, truncated_count)

    story = [
        _paragraph("DataLens Dataset Report", title_style, supported_codepoints, truncated_count),
        _paragraph(dataset.filename, cell_style, supported_codepoints, truncated_count),
        _paragraph("Generated from the dataset analysis currently stored by DataLens.", note_style, supported_codepoints, truncated_count),
        Spacer(1, 10),
        _paragraph("Dataset summary", section_style, supported_codepoints, truncated_count),
        report_table([
            ["Measure", "Value"],
            ["Rows", str(dataset.row_count)],
            ["Columns", str(dataset.column_count)],
            ["Duplicate rows", str(dataset.duplicate_rows)],
        ], [3.2 * inch, 3.2 * inch]),
        _paragraph("Missing values by column", section_style, supported_codepoints, truncated_count),
    ]

    omitted_rows = 0
    missing = list((dataset.missing_values or {}).items())
    visible_missing = missing[:MAX_DETAIL_ROWS]
    omitted_rows += max(0, len(missing) - len(visible_missing))
    if visible_missing:
        story.append(report_table(
            [["Column", "Missing values"], *[[str(column), str(count)] for column, count in visible_missing]],
            [4.7 * inch, 1.7 * inch],
        ))
    else:
        story.append(_paragraph("No missing values were recorded in the analysis.", cell_style, supported_codepoints, truncated_count))

    story.append(_paragraph("Numeric descriptive statistics", section_style, supported_codepoints, truncated_count))
    statistics = list((dataset.stats or {}).items())
    visible_statistics = statistics[:MAX_DETAIL_ROWS]
    omitted_rows += max(0, len(statistics) - len(visible_statistics))
    if visible_statistics:
        stat_rows = [["Column", "Count", "Mean", "Min", "Max", "Median", "Std. dev."]]
        for column, values in visible_statistics:
            values = values if isinstance(values, dict) else {}
            stat_rows.append([str(column), *["" if values.get(key) is None else str(values.get(key)) for key in ("count", "mean", "min", "max", "median", "std")]])
        story.append(report_table(stat_rows, [1.55 * inch, 0.6 * inch, 0.9 * inch, 0.75 * inch, 0.75 * inch, 0.8 * inch, 0.85 * inch]))
    else:
        story.append(_paragraph("No numeric descriptive statistics were recorded.", cell_style, supported_codepoints, truncated_count))

    charts = [item for item in (dataset.chart_summary or []) if isinstance(item, dict) and item.get("type") == "bar" and item.get("values")]
    story.append(_paragraph("Categorical frequency summaries", section_style, supported_codepoints, truncated_count))
    if charts:
        for chart in charts[:5]:
            values = chart.get("values") or []
            visible_values = values[:MAX_CATEGORIES_PER_CHART]
            omitted_rows += max(0, len(values) - len(visible_values))
            story.append(_paragraph(f"Column: {chart.get('column', 'Unknown')}", cell_style, supported_codepoints, truncated_count))
            rows = [["Category", "Rows"], *[[str(_format_date_label(item.get("label", ""))), str(item.get("value", ""))] for item in visible_values]]
            story.append(report_table(rows, [4.7 * inch, 1.7 * inch]))
            drawing = _category_chart({**chart, "values": visible_values}, regular_font, supported_codepoints, truncated_count)
            if drawing:
                story.extend([Spacer(1, 5), drawing])
        omitted_rows += max(0, len(charts) - 5)
    else:
        story.append(_paragraph("No categorical frequency summary was recorded.", cell_style, supported_codepoints, truncated_count))

    if omitted_rows:
        story.append(_paragraph(f"Report size limit: {omitted_rows} additional stored detail rows or summaries were omitted.", note_style, supported_codepoints, truncated_count))
    if truncated_count[0]:
        story.append(_paragraph(f"Report size limit: {truncated_count[0]} long labels were shortened to {MAX_LABEL_LENGTH} characters.", note_style, supported_codepoints, truncated_count))
    story.extend([
        Spacer(1, 12),
        _paragraph("This report contains stored descriptive summaries only. It does not infer causation or add uncomputed statistics.", note_style, supported_codepoints, truncated_count),
    ])
    document.build(story)
    return buffer.getvalue()
