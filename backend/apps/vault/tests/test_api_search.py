"""
Tests for Vault Search and Graph API endpoints
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model

from apps.vault.models import Page, PageLink

User = get_user_model()


class SearchAPITest(TestCase):
    """Tests for GET /api/vault/search/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_search_by_title(self):
        """Test searching pages by title"""
        Page.objects.create(user=self.user, title='Meeting Notes')
        Page.objects.create(user=self.user, title='Shopping List')
        Page.objects.create(user=self.user, title='Project Plan')

        response = self.client.get('/api/vault/search/?q=Meeting')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Meeting Notes')

    def test_search_by_content(self):
        """Test searching pages by content"""
        Page.objects.create(
            user=self.user,
            title='Page 1',
            content={'text': 'Contains the keyword Django'}
        )
        Page.objects.create(
            user=self.user,
            title='Page 2',
            content={'text': 'Contains nothing special'}
        )

        response = self.client.get('/api/vault/search/?q=Django')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Page 1')

    def test_search_case_insensitive(self):
        """Test that search is case insensitive"""
        Page.objects.create(user=self.user, title='IMPORTANT Document')

        response = self.client.get('/api/vault/search/?q=important')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'IMPORTANT Document')

    def test_search_partial_match(self):
        """Test that partial matches work"""
        Page.objects.create(user=self.user, title='Development Notes')

        response = self.client.get('/api/vault/search/?q=Dev')
        data = response.json()

        self.assertEqual(len(data), 1)

    def test_search_multiple_results(self):
        """Test search returning multiple results"""
        Page.objects.create(user=self.user, title='Python Tutorial')
        Page.objects.create(user=self.user, title='Python Advanced')
        Page.objects.create(user=self.user, title='JavaScript Basics')

        response = self.client.get('/api/vault/search/?q=Python')
        data = response.json()

        self.assertEqual(len(data), 2)

    def test_search_no_results(self):
        """Test search with no matching results"""
        Page.objects.create(user=self.user, title='Page 1')

        response = self.client.get('/api/vault/search/?q=nonexistent')
        data = response.json()

        self.assertEqual(len(data), 0)

    def test_search_limit_results(self):
        """Test that search limits results to 50"""
        # Create 60 pages
        for i in range(60):
            Page.objects.create(user=self.user, title=f'Test Page {i}')

        response = self.client.get('/api/vault/search/?q=Test')
        data = response.json()

        self.assertEqual(len(data), 50)

    def test_search_user_isolation(self):
        """Test that search only returns user's own pages"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        Page.objects.create(user=self.user, title='My Secret Page')
        Page.objects.create(user=other_user, title='Other Secret Page')

        response = self.client.get('/api/vault/search/?q=Secret')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'My Secret Page')

    def test_search_includes_has_children(self):
        """Test that search results include has_children"""
        parent = Page.objects.create(user=self.user, title='Parent Page')
        Page.objects.create(user=self.user, title='Child', parent=parent)

        response = self.client.get('/api/vault/search/?q=Parent')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertTrue(data[0]['has_children'])


class GraphAPITest(TestCase):
    """Tests for GET /api/vault/graph/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_graph_empty(self):
        """Test graph with no pages"""
        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(data['nodes'], [])
        self.assertEqual(data['edges'], [])

    def test_graph_nodes(self):
        """Test graph nodes represent pages"""
        Page.objects.create(user=self.user, title='Page 1', icon='📄')
        Page.objects.create(user=self.user, title='Page 2', icon='📁')

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['nodes']), 2)
        titles = [n['title'] for n in data['nodes']]
        self.assertIn('Page 1', titles)
        self.assertIn('Page 2', titles)

    def test_graph_node_contains_icon(self):
        """Test graph nodes contain icon"""
        Page.objects.create(user=self.user, title='Page', icon='🚀')

        response = self.client.get('/api/vault/graph/')
        node = response.json()['nodes'][0]

        self.assertEqual(node['icon'], '🚀')

    def test_graph_edges(self):
        """Test graph edges represent links"""
        page1 = Page.objects.create(user=self.user, title='Source')
        page2 = Page.objects.create(user=self.user, title='Target')
        PageLink.objects.create(source=page1, target=page2)

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['edges']), 1)
        self.assertEqual(data['edges'][0]['source'], page1.id)
        self.assertEqual(data['edges'][0]['target'], page2.id)

    def test_graph_multiple_edges(self):
        """Test graph with multiple links"""
        page1 = Page.objects.create(user=self.user, title='Page 1')
        page2 = Page.objects.create(user=self.user, title='Page 2')
        page3 = Page.objects.create(user=self.user, title='Page 3')

        PageLink.objects.create(source=page1, target=page2)
        PageLink.objects.create(source=page1, target=page3)
        PageLink.objects.create(source=page2, target=page3)

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['nodes']), 3)
        self.assertEqual(len(data['edges']), 3)

    def test_graph_link_count(self):
        """Test graph nodes include link count"""
        hub = Page.objects.create(user=self.user, title='Hub')
        for i in range(3):
            spoke = Page.objects.create(user=self.user, title=f'Spoke {i}')
            PageLink.objects.create(source=hub, target=spoke)

        response = self.client.get('/api/vault/graph/')
        nodes = response.json()['nodes']

        hub_node = next(n for n in nodes if n['title'] == 'Hub')
        self.assertEqual(hub_node['link_count'], 3)

    def test_graph_user_isolation(self):
        """Test that graph only shows user's own pages"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        Page.objects.create(user=self.user, title='My Page')
        Page.objects.create(user=other_user, title='Other Page')

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['nodes']), 1)
        self.assertEqual(data['nodes'][0]['title'], 'My Page')

    def test_graph_edges_only_user_links(self):
        """Test that graph only shows user's own links"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )

        # My pages and link
        my_page1 = Page.objects.create(user=self.user, title='My Page 1')
        my_page2 = Page.objects.create(user=self.user, title='My Page 2')
        PageLink.objects.create(source=my_page1, target=my_page2)

        # Other user's pages and link
        other_page1 = Page.objects.create(user=other_user, title='Other 1')
        other_page2 = Page.objects.create(user=other_user, title='Other 2')
        PageLink.objects.create(source=other_page1, target=other_page2)

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['nodes']), 2)
        self.assertEqual(len(data['edges']), 1)

    def test_graph_bidirectional_links(self):
        """Test bidirectional links appear as two edges"""
        page1 = Page.objects.create(user=self.user, title='Page 1')
        page2 = Page.objects.create(user=self.user, title='Page 2')

        PageLink.objects.create(source=page1, target=page2)
        PageLink.objects.create(source=page2, target=page1)

        response = self.client.get('/api/vault/graph/')
        data = response.json()

        self.assertEqual(len(data['edges']), 2)
