import unittest

from app.services.reports import _format_date_label


class ReportDateLabelTests(unittest.TestCase):
    def test_formats_iso_dates_and_timestamps_for_report_display(self):
        self.assertEqual(_format_date_label("2026-11-12"), "12/11/2026")
        self.assertEqual(_format_date_label("2026-11-12T10:30:00"), "12/11/2026, 10:30 AM")
        self.assertEqual(_format_date_label("2026-12-21 16:05:00+05:30"), "21/12/2026, 4:05 PM UTC+05:30")
        self.assertEqual(_format_date_label("not a date"), "not a date")


if __name__ == "__main__":
    unittest.main()
