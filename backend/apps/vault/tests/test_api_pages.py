"""
Tests for Vault Page API endpoints
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json

from apps.vault.models import Page, Tag, PageLink

User = get_user_model()


class PageListAPITest(TestCase):
    """Tests for GET /api/vault/pages/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_list_pages_empty(self):
        """Test listing pages when none exist"""
        response = self.client.get('/api/vault/pages/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_list_pages_root_only(self):
        """Test listing only returns root pages by default"""
        root = Page.objects.create(user=self.user, title='Root')
        Page.objects.create(user=self.user, title='Child', parent=root)

        response = self.client.get('/api/vault/pages/')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Root')
        self.assertTrue(data[0]['has_children'])

    def test_list_pages_by_parent(self):
        """Test listing children of a specific parent"""
        parent = Page.objects.create(user=self.user, title='Parent')
        Page.objects.create(user=self.user, title='Child 1', parent=parent)
        Page.objects.create(user=self.user, title='Child 2', parent=parent)

        response = self.client.get(f'/api/vault/pages/?parent_id={parent.id}')
        data = response.json()

        self.assertEqual(len(data), 2)
        titles = [p['title'] for p in data]
        self.assertIn('Child 1', titles)
        self.assertIn('Child 2', titles)

    def test_list_pages_favorites_only(self):
        """Test listing only favorited pages"""
        Page.objects.create(user=self.user, title='Normal')
        Page.objects.create(user=self.user, title='Favorite', is_favorited=True)

        response = self.client.get('/api/vault/pages/?favorites_only=true')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Favorite')

    def test_list_pages_search(self):
        """Test searching pages by title"""
        Page.objects.create(user=self.user, title='Meeting Notes')
        Page.objects.create(user=self.user, title='Shopping List')

        response = self.client.get('/api/vault/pages/?search=Meeting')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'Meeting Notes')

    def test_list_pages_user_isolation(self):
        """Test that users only see their own pages"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        Page.objects.create(user=self.user, title='My Page')
        Page.objects.create(user=other_user, title='Other Page')

        response = self.client.get('/api/vault/pages/')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['title'], 'My Page')


class PageDetailAPITest(TestCase):
    """Tests for GET /api/vault/pages/{id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_get_page_detail(self):
        """Test getting page details"""
        page = Page.objects.create(
            user=self.user,
            title='Test Page',
            icon='📄',
            content={'type': 'doc', 'content': []}
        )

        response = self.client.get(f'/api/vault/pages/{page.id}/')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data['title'], 'Test Page')
        self.assertEqual(data['icon'], '📄')
        self.assertEqual(data['content']['type'], 'doc')

    def test_get_page_with_breadcrumbs(self):
        """Test that page includes breadcrumbs"""
        parent = Page.objects.create(user=self.user, title='Parent', icon='📁')
        child = Page.objects.create(user=self.user, title='Child', icon='📄', parent=parent)

        response = self.client.get(f'/api/vault/pages/{child.id}/')
        data = response.json()

        self.assertEqual(len(data['breadcrumbs']), 2)
        self.assertEqual(data['breadcrumbs'][0]['title'], 'Parent')
        self.assertEqual(data['breadcrumbs'][1]['title'], 'Child')

    def test_get_page_with_backlinks(self):
        """Test that page includes backlinks"""
        target = Page.objects.create(user=self.user, title='Target')
        source = Page.objects.create(user=self.user, title='Source')
        PageLink.objects.create(source=source, target=target)

        response = self.client.get(f'/api/vault/pages/{target.id}/')
        data = response.json()

        self.assertEqual(len(data['backlinks']), 1)
        self.assertEqual(data['backlinks'][0]['title'], 'Source')

    def test_get_page_not_found(self):
        """Test 404 for non-existent page"""
        response = self.client.get('/api/vault/pages/99999/')
        self.assertEqual(response.status_code, 404)

    def test_get_page_other_user(self):
        """Test 404 for other user's page"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        page = Page.objects.create(user=other_user, title='Other Page')

        response = self.client.get(f'/api/vault/pages/{page.id}/')
        self.assertEqual(response.status_code, 404)


class PageCreateAPITest(TestCase):
    """Tests for POST /api/vault/pages/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_create_page_minimal(self):
        """Test creating page with minimal data"""
        response = self.client.post(
            '/api/vault/pages/',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['title'], 'Untitled')
        self.assertIsNone(data['parent_id'])

    def test_create_page_with_title(self):
        """Test creating page with title"""
        response = self.client.post(
            '/api/vault/pages/',
            data=json.dumps({'title': 'My New Page'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['title'], 'My New Page')

    def test_create_page_with_parent(self):
        """Test creating child page"""
        parent = Page.objects.create(user=self.user, title='Parent')

        response = self.client.post(
            '/api/vault/pages/',
            data=json.dumps({'title': 'Child', 'parent_id': parent.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['parent_id'], parent.id)
        self.assertEqual(data['breadcrumbs'][0]['title'], 'Parent')

    def test_create_page_with_content(self):
        """Test creating page with content"""
        content = {'type': 'doc', 'content': [{'type': 'paragraph'}]}

        response = self.client.post(
            '/api/vault/pages/',
            data=json.dumps({'title': 'Page', 'content': content}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['content']['type'], 'doc')

    def test_create_page_with_icon(self):
        """Test creating page with icon"""
        response = self.client.post(
            '/api/vault/pages/',
            data=json.dumps({'title': 'Page', 'icon': '🚀'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['icon'], '🚀')


class PageUpdateAPITest(TestCase):
    """Tests for PUT /api/vault/pages/{id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(
            user=self.user,
            title='Original Title',
            icon='📄'
        )

    def test_update_page_title(self):
        """Test updating page title"""
        response = self.client.put(
            f'/api/vault/pages/{self.page.id}/',
            data=json.dumps({'title': 'New Title'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['title'], 'New Title')

    def test_update_page_icon(self):
        """Test updating page icon"""
        response = self.client.put(
            f'/api/vault/pages/{self.page.id}/',
            data=json.dumps({'icon': '🎉'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['icon'], '🎉')

    def test_update_page_content(self):
        """Test updating page content"""
        new_content = {'type': 'doc', 'content': [{'type': 'heading'}]}

        response = self.client.put(
            f'/api/vault/pages/{self.page.id}/',
            data=json.dumps({'content': new_content}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['content']['type'], 'doc')

    def test_update_page_favorite(self):
        """Test setting page as favorite"""
        response = self.client.put(
            f'/api/vault/pages/{self.page.id}/',
            data=json.dumps({'is_favorited': True}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_favorited'])

    def test_update_page_tags(self):
        """Test updating page tags"""
        tag1 = Tag.objects.create(user=self.user, name='tag1')
        tag2 = Tag.objects.create(user=self.user, name='tag2')

        response = self.client.put(
            f'/api/vault/pages/{self.page.id}/',
            data=json.dumps({'tag_ids': [tag1.id, tag2.id]}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        tags = response.json()['tags']
        self.assertEqual(len(tags), 2)

    def test_update_page_not_found(self):
        """Test 404 for non-existent page"""
        response = self.client.put(
            '/api/vault/pages/99999/',
            data=json.dumps({'title': 'New'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


class PageDeleteAPITest(TestCase):
    """Tests for DELETE /api/vault/pages/{id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_delete_page(self):
        """Test deleting a page"""
        page = Page.objects.create(user=self.user, title='To Delete')

        response = self.client.delete(f'/api/vault/pages/{page.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.assertFalse(Page.objects.filter(id=page.id).exists())

    def test_delete_page_cascades_children(self):
        """Test that deleting parent deletes children"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child = Page.objects.create(user=self.user, title='Child', parent=parent)

        response = self.client.delete(f'/api/vault/pages/{parent.id}/')
        self.assertEqual(response.status_code, 200)

        self.assertFalse(Page.objects.filter(id=child.id).exists())

    def test_delete_page_not_found(self):
        """Test 404 for non-existent page"""
        response = self.client.delete('/api/vault/pages/99999/')
        self.assertEqual(response.status_code, 404)

    def test_delete_other_users_page(self):
        """Test 404 when trying to delete other user's page"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        page = Page.objects.create(user=other_user, title='Other Page')

        response = self.client.delete(f'/api/vault/pages/{page.id}/')
        self.assertEqual(response.status_code, 404)

        # Page should still exist
        self.assertTrue(Page.objects.filter(id=page.id).exists())


class PageMoveAPITest(TestCase):
    """Tests for POST /api/vault/pages/{id}/move/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_move_page_to_root(self):
        """Test moving page to root"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child = Page.objects.create(user=self.user, title='Child', parent=parent)

        response = self.client.post(
            f'/api/vault/pages/{child.id}/move/',
            data=json.dumps({'parent_id': None}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()['parent_id'])

    def test_move_page_to_parent(self):
        """Test moving page under another page"""
        page1 = Page.objects.create(user=self.user, title='Page 1')
        page2 = Page.objects.create(user=self.user, title='Page 2')

        response = self.client.post(
            f'/api/vault/pages/{page1.id}/move/',
            data=json.dumps({'parent_id': page2.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['parent_id'], page2.id)

    def test_move_page_circular_reference_self(self):
        """Test that moving page into itself fails"""
        page = Page.objects.create(user=self.user, title='Page')

        response = self.client.post(
            f'/api/vault/pages/{page.id}/move/',
            data=json.dumps({'parent_id': page.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_move_page_circular_reference_descendant(self):
        """Test that moving page into its descendant fails"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child = Page.objects.create(user=self.user, title='Child', parent=parent)
        grandchild = Page.objects.create(user=self.user, title='Grandchild', parent=child)

        response = self.client.post(
            f'/api/vault/pages/{parent.id}/move/',
            data=json.dumps({'parent_id': grandchild.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)


class PageFavoriteAPITest(TestCase):
    """Tests for POST /api/vault/pages/{id}/favorite/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_toggle_favorite_on(self):
        """Test setting favorite to true"""
        page = Page.objects.create(user=self.user, title='Page', is_favorited=False)

        response = self.client.post(f'/api/vault/pages/{page.id}/favorite/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_favorited'])

    def test_toggle_favorite_off(self):
        """Test setting favorite to false"""
        page = Page.objects.create(user=self.user, title='Page', is_favorited=True)

        response = self.client.post(f'/api/vault/pages/{page.id}/favorite/')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['is_favorited'])

    def test_toggle_favorite_twice(self):
        """Test toggling favorite twice returns to original state"""
        page = Page.objects.create(user=self.user, title='Page', is_favorited=False)

        self.client.post(f'/api/vault/pages/{page.id}/favorite/')
        response = self.client.post(f'/api/vault/pages/{page.id}/favorite/')

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['is_favorited'])
