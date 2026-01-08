"""
Tests for Vault Database API endpoints
"""
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
import json

from apps.vault.models import Page, Database, DatabaseRow

User = get_user_model()


class DatabaseGetAPITest(TestCase):
    """Tests for GET /api/vault/databases/{page_id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')

    def test_get_database(self):
        """Test getting database for a page"""
        schema = {
            'columns': [
                {'id': 'title', 'type': 'title', 'name': 'Name'},
                {'id': 'status', 'type': 'select', 'name': 'Status'}
            ]
        }
        db = Database.objects.create(page=self.page, schema=schema)
        DatabaseRow.objects.create(database=db, data={'title': 'Row 1'})

        response = self.client.get(f'/api/vault/databases/{self.page.id}/')
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data['page_id'], self.page.id)
        self.assertEqual(len(data['schema']['columns']), 2)
        self.assertEqual(len(data['rows']), 1)

    def test_get_database_not_found(self):
        """Test 404 when page has no database"""
        response = self.client.get(f'/api/vault/databases/{self.page.id}/')
        self.assertEqual(response.status_code, 404)

    def test_get_database_other_user(self):
        """Test 404 for other user's page"""
        other_user = User.objects.create_user(
            username='other', email='other@example.com', password='test'
        )
        other_page = Page.objects.create(user=other_user, title='Other')
        Database.objects.create(page=other_page, schema={'columns': []})

        response = self.client.get(f'/api/vault/databases/{other_page.id}/')
        self.assertEqual(response.status_code, 404)


class DatabaseCreateAPITest(TestCase):
    """Tests for POST /api/vault/databases/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')

    def test_create_database_default_schema(self):
        """Test creating database with default schema"""
        response = self.client.post(
            '/api/vault/databases/',
            data=json.dumps({'page_id': self.page.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['page_id'], self.page.id)
        self.assertEqual(data['default_view'], 'table')
        # Default schema has title and status columns
        self.assertEqual(len(data['schema']['columns']), 2)
        self.assertEqual(data['schema']['columns'][0]['type'], 'title')

    def test_create_database_custom_schema(self):
        """Test creating database with custom schema"""
        custom_schema = {
            'columns': [
                {'id': 'name', 'type': 'title', 'name': 'Task Name'},
                {'id': 'done', 'type': 'checkbox', 'name': 'Done'}
            ]
        }

        response = self.client.post(
            '/api/vault/databases/',
            data=json.dumps({'page_id': self.page.id, 'schema': custom_schema}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(len(data['schema']['columns']), 2)
        self.assertEqual(data['schema']['columns'][1]['type'], 'checkbox')

    def test_create_database_custom_view(self):
        """Test creating database with kanban view"""
        response = self.client.post(
            '/api/vault/databases/',
            data=json.dumps({'page_id': self.page.id, 'default_view': 'kanban'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['default_view'], 'kanban')

    def test_create_database_already_exists(self):
        """Test error when page already has database"""
        Database.objects.create(page=self.page, schema={'columns': []})

        response = self.client.post(
            '/api/vault/databases/',
            data=json.dumps({'page_id': self.page.id}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json())


class DatabaseUpdateAPITest(TestCase):
    """Tests for PUT /api/vault/databases/{page_id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')
        self.database = Database.objects.create(
            page=self.page,
            schema={'columns': [{'id': 'title', 'type': 'title', 'name': 'Name'}]},
            default_view='table'
        )

    def test_update_database_schema(self):
        """Test updating database schema"""
        new_schema = {
            'columns': [
                {'id': 'title', 'type': 'title', 'name': 'Name'},
                {'id': 'new_col', 'type': 'text', 'name': 'New Column'}
            ]
        }

        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/',
            data=json.dumps({'schema': new_schema}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['schema']['columns']), 2)

    def test_update_database_view(self):
        """Test updating default view"""
        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/',
            data=json.dumps({'default_view': 'kanban'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['default_view'], 'kanban')

    def test_update_database_kanban_column(self):
        """Test updating kanban column ID"""
        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/',
            data=json.dumps({'kanban_column_id': 'status'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['kanban_column_id'], 'status')

    def test_update_database_not_found(self):
        """Test 404 when page has no database"""
        new_page = Page.objects.create(user=self.user, title='No DB')

        response = self.client.put(
            f'/api/vault/databases/{new_page.id}/',
            data=json.dumps({'default_view': 'kanban'}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


class DatabaseDeleteAPITest(TestCase):
    """Tests for DELETE /api/vault/databases/{page_id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')

    def test_delete_database(self):
        """Test deleting database keeps page"""
        db = Database.objects.create(page=self.page, schema={'columns': []})

        response = self.client.delete(f'/api/vault/databases/{self.page.id}/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        # Database should be deleted
        self.assertFalse(Database.objects.filter(id=db.id).exists())
        # Page should still exist
        self.assertTrue(Page.objects.filter(id=self.page.id).exists())

    def test_delete_database_not_found(self):
        """Test 404 when page has no database"""
        response = self.client.delete(f'/api/vault/databases/{self.page.id}/')
        self.assertEqual(response.status_code, 404)


class DatabaseRowCreateAPITest(TestCase):
    """Tests for POST /api/vault/databases/{page_id}/rows/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')
        self.database = Database.objects.create(
            page=self.page,
            schema={'columns': [{'id': 'title', 'type': 'title', 'name': 'Name'}]}
        )

    def test_create_row_empty(self):
        """Test creating row with empty data"""
        response = self.client.post(
            f'/api/vault/databases/{self.page.id}/rows/',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['data'], {})
        self.assertEqual(data['position'], 1)  # Auto-incremented

    def test_create_row_with_data(self):
        """Test creating row with data"""
        row_data = {'title': 'My Task', 'status': 'todo'}

        response = self.client.post(
            f'/api/vault/databases/{self.page.id}/rows/',
            data=json.dumps({'data': row_data}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)

        data = response.json()
        self.assertEqual(data['data']['title'], 'My Task')
        self.assertEqual(data['data']['status'], 'todo')

    def test_create_row_position_auto_increment(self):
        """Test row position auto-increments"""
        DatabaseRow.objects.create(database=self.database, position=5)

        response = self.client.post(
            f'/api/vault/databases/{self.page.id}/rows/',
            data=json.dumps({}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['position'], 6)

    def test_create_row_custom_position(self):
        """Test creating row with custom position"""
        response = self.client.post(
            f'/api/vault/databases/{self.page.id}/rows/',
            data=json.dumps({'position': 10}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['position'], 10)


class DatabaseRowUpdateAPITest(TestCase):
    """Tests for PUT /api/vault/databases/{page_id}/rows/{row_id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')
        self.database = Database.objects.create(
            page=self.page,
            schema={'columns': [{'id': 'title', 'type': 'title', 'name': 'Name'}]}
        )
        self.row = DatabaseRow.objects.create(
            database=self.database,
            data={'title': 'Original'},
            position=0
        )

    def test_update_row_data(self):
        """Test updating row data"""
        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/rows/{self.row.id}/',
            data=json.dumps({'data': {'title': 'Updated', 'new_field': 'value'}}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data['data']['title'], 'Updated')
        self.assertEqual(data['data']['new_field'], 'value')

    def test_update_row_position(self):
        """Test updating row position"""
        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/rows/{self.row.id}/',
            data=json.dumps({'position': 5}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['position'], 5)

    def test_update_row_not_found(self):
        """Test 404 for non-existent row"""
        response = self.client.put(
            f'/api/vault/databases/{self.page.id}/rows/99999/',
            data=json.dumps({'data': {'title': 'Test'}}),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 404)


class DatabaseRowDeleteAPITest(TestCase):
    """Tests for DELETE /api/vault/databases/{page_id}/rows/{row_id}/"""

    def setUp(self):
        self.client = Client()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_login(self.user)
        self.page = Page.objects.create(user=self.user, title='Database Page')
        self.database = Database.objects.create(
            page=self.page,
            schema={'columns': []}
        )

    def test_delete_row(self):
        """Test deleting a row"""
        row = DatabaseRow.objects.create(database=self.database)

        response = self.client.delete(
            f'/api/vault/databases/{self.page.id}/rows/{row.id}/'
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['success'])

        self.assertFalse(DatabaseRow.objects.filter(id=row.id).exists())

    def test_delete_row_not_found(self):
        """Test 404 for non-existent row"""
        response = self.client.delete(
            f'/api/vault/databases/{self.page.id}/rows/99999/'
        )
        self.assertEqual(response.status_code, 404)
