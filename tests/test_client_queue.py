import unittest
from client import client


class DashboardClientQueueTests(unittest.TestCase):
    def test_retries_only_transient_http_errors(self):
        self.assertTrue(client._should_enqueue_http_error(429))
        self.assertTrue(client._should_enqueue_http_error(500))
        self.assertTrue(client._should_enqueue_http_error(503))
        self.assertFalse(client._should_enqueue_http_error(400))
        self.assertFalse(client._should_enqueue_http_error(401))
        self.assertFalse(client._should_enqueue_http_error(404))


if __name__ == "__main__":
    unittest.main()
