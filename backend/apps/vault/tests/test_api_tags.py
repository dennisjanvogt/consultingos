"""
Tests for Vault Tag API endpoints
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json

from apps.vault.models import Tag

User = get_user_model()


class TagListAPITest(TestCase):
    """Tests for GET /api/vault/tags/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_list_tags_empty(self):
        """Test listing tags when none exist"""
        response = self.client.get('/api/vault/tags/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_list_tags(self):
        """Test listing user's tags"""
        Tag.objects.create(user=self.user, name='work', color='blue')
        Tag.objects.create(user=self.user, name='personal', color='green')

        response = self.client.get('/api/vault/tags/')
        data = response.json()

        self.assertEqual(len(data), 2)
        names = [t['name'] for t in data]
        self.assertIn('work', names)
        self.assertIn('personal', names)

    def test_list_tags_user_isolation(self):
        """Test that users only see their own tags"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        Tag.objects.create(user=self.user, name='my-tag')
        Tag.objects.create(user=other_user, name='other-tag')

        response = self.client.get('/api/vault/tags/')
        data = response.json()

        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['name'], 'my-tag')


class TagCreateAPITest(TestCase):
    """Tests for POST /api/vault/tags/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_create_tag(self):
        """Test creating a tag"""
        response = self.client.post(
            '/api/vault/tags/',
            data=json.dumps({'name': 'new-tag'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['name'], 'new-tag')
        self.assertEqual(data['color'], 'gray')  # default color

    def test_create_tag_with_color(self):
        """Test creating a tag with custom color"""
        response = self.client.post(
            '/api/vault/tags/',
            data=json.dumps({'name': 'colored-tag', 'color': 'red'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['color'], 'red')

    def test_create_tag_duplicate_name(self):
        """Test that duplicate tag names fail"""
        Tag.objects.create(user=self.user, name='existing')

        response = self.client.post(
            '/api/vault/tags/',
            data=json.dumps({'name': 'existing'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())

    def test_create_tag_same_name_different_user(self):
        """Test that different users can have same tag name"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        Tag.objects.create(user=other_user, name='shared-name')

        response = self.client.post(
            '/api/vault/tags/',
            data=json.dumps({'name': 'shared-name'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)


class TagDeleteAPITest(TestCase):
    """Tests for DELETE /api/vault/tags/{id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)

    def test_delete_tag(self):
        """Test deleting a tag"""
        tag = Tag.objects.create(user=self.user, name='to-delete')

        response = self.client.delete(f'/api/vault/tags/{tag.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.assertFalse(Tag.objects.filter(id=tag.id).exists())

    def test_delete_tag_not_found(self):
        """Test 404 for non-existent tag"""
        response = self.client.delete('/api/vault/tags/99999/')
        self.assertEqual(response.status_code, 404)

    def test_delete_other_users_tag(self):
        """Test 404 when trying to delete other user's tag"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        tag = Tag.objects.create(user=other_user, name='other-tag')

        response = self.client.delete(f'/api/vault/tags/{tag.id}/')
        self.assertEqual(response.status_code, 404)

        # Tag should still exist
        self.assertTrue(Tag.objects.filter(id=tag.id).exists())
