"""
Tests for Vault models: Page, Tag, PageLink, Database, DatabaseRow
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from apps.vault.models import Page, Tag, PageLink, Database, DatabaseRow

User = get_user_model()


class TagModelTest(TestCase):
    """Tests for the Tag model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_tag_creation(self):
        """Test basic tag creation"""
        tag = Tag.objects.create(
            user=self.user,
            name='work',
            color='blue'
        )
        self.assertEqual(tag.name, 'work')
        self.assertEqual(tag.color, 'blue')
        self.assertEqual(tag.user, self.user)
        self.assertIsNotNone(tag.created_at)

    def test_tag_default_color(self):
        """Test tag default color is gray"""
        tag = Tag.objects.create(
            user=self.user,
            name='default'
        )
        self.assertEqual(tag.color, 'gray')

    def test_tag_str_representation(self):
        """Test tag string representation"""
        tag = Tag.objects.create(user=self.user, name='my-tag')
        self.assertEqual(str(tag), 'my-tag')

    def test_tag_unique_per_user(self):
        """Test that tag names are unique per user"""
        Tag.objects.create(user=self.user, name='unique-tag')
        with self.assertRaises(IntegrityError):
            Tag.objects.create(user=self.user, name='unique-tag')

    def test_tag_same_name_different_users(self):
        """Test that different users can have tags with same name"""
        user2 = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123'
        )
        Tag.objects.create(user=self.user, name='shared-name')
        tag2 = Tag.objects.create(user=user2, name='shared-name')
        self.assertEqual(tag2.name, 'shared-name')


class PageModelTest(TestCase):
    """Tests for the Page model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_page_creation(self):
        """Test basic page creation"""
        page = Page.objects.create(
            user=self.user,
            title='Test Page'
        )
        self.assertEqual(page.title, 'Test Page')
        self.assertEqual(page.user, self.user)
        self.assertIsNone(page.parent)
        self.assertFalse(page.is_favorited)
        self.assertEqual(page.position, 0)

    def test_page_default_title(self):
        """Test page default title is 'Untitled'"""
        page = Page.objects.create(user=self.user)
        self.assertEqual(page.title, 'Untitled')

    def test_page_default_content(self):
        """Test page default content is empty dict"""
        page = Page.objects.create(user=self.user)
        self.assertEqual(page.content, {})

    def test_page_str_representation(self):
        """Test page string representation"""
        page = Page.objects.create(user=self.user, title='My Page')
        self.assertEqual(str(page), 'My Page')

    def test_page_hierarchy_parent_child(self):
        """Test parent-child relationship"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child = Page.objects.create(user=self.user, title='Child', parent=parent)

        self.assertEqual(child.parent, parent)
        self.assertIn(child, parent.children.all())

    def test_page_hierarchy_three_levels(self):
        """Test three-level hierarchy"""
        grandparent = Page.objects.create(user=self.user, title='Grandparent')
        parent = Page.objects.create(user=self.user, title='Parent', parent=grandparent)
        child = Page.objects.create(user=self.user, title='Child', parent=parent)

        self.assertEqual(child.parent.parent, grandparent)

    def test_get_breadcrumbs_root(self):
        """Test breadcrumbs for root page"""
        page = Page.objects.create(user=self.user, title='Root', icon='📄')
        breadcrumbs = page.get_breadcrumbs()

        self.assertEqual(len(breadcrumbs), 1)
        self.assertEqual(breadcrumbs[0]['title'], 'Root')
        self.assertEqual(breadcrumbs[0]['icon'], '📄')

    def test_get_breadcrumbs_nested(self):
        """Test breadcrumbs for nested page"""
        parent = Page.objects.create(user=self.user, title='Parent', icon='📁')
        child = Page.objects.create(user=self.user, title='Child', icon='📄', parent=parent)

        breadcrumbs = child.get_breadcrumbs()

        self.assertEqual(len(breadcrumbs), 2)
        self.assertEqual(breadcrumbs[0]['title'], 'Parent')
        self.assertEqual(breadcrumbs[1]['title'], 'Child')

    def test_get_all_descendants_no_children(self):
        """Test get_all_descendants with no children"""
        page = Page.objects.create(user=self.user, title='Leaf')
        descendants = page.get_all_descendants()
        self.assertEqual(descendants, [])

    def test_get_all_descendants_with_children(self):
        """Test get_all_descendants with multiple levels"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child1 = Page.objects.create(user=self.user, title='Child 1', parent=parent)
        child2 = Page.objects.create(user=self.user, title='Child 2', parent=parent)
        grandchild = Page.objects.create(user=self.user, title='Grandchild', parent=child1)

        descendants = parent.get_all_descendants()

        self.assertEqual(len(descendants), 3)
        self.assertIn(child1, descendants)
        self.assertIn(child2, descendants)
        self.assertIn(grandchild, descendants)

    def test_page_cascade_delete_children(self):
        """Test that deleting parent deletes children"""
        parent = Page.objects.create(user=self.user, title='Parent')
        child = Page.objects.create(user=self.user, title='Child', parent=parent)
        child_id = child.id

        parent.delete()

        self.assertFalse(Page.objects.filter(id=child_id).exists())

    def test_page_tags_relationship(self):
        """Test many-to-many relationship with tags"""
        page = Page.objects.create(user=self.user, title='Tagged Page')
        tag1 = Tag.objects.create(user=self.user, name='tag1')
        tag2 = Tag.objects.create(user=self.user, name='tag2')

        page.tags.add(tag1, tag2)

        self.assertEqual(page.tags.count(), 2)
        self.assertIn(tag1, page.tags.all())
        self.assertIn(tag2, page.tags.all())

    def test_page_with_json_content(self):
        """Test page with TipTap-style JSON content"""
        content = {
            'type': 'doc',
            'content': [
                {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Hello'}]}
            ]
        }
        page = Page.objects.create(user=self.user, title='Page', content=content)

        self.assertEqual(page.content['type'], 'doc')
        self.assertEqual(len(page.content['content']), 1)


class PageLinkModelTest(TestCase):
    """Tests for the PageLink model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.source_page = Page.objects.create(user=self.user, title='Source')
        self.target_page = Page.objects.create(user=self.user, title='Target')

    def test_link_creation(self):
        """Test creating a link between pages"""
        link = PageLink.objects.create(
            source=self.source_page,
            target=self.target_page
        )
        self.assertEqual(link.source, self.source_page)
        self.assertEqual(link.target, self.target_page)

    def test_link_str_representation(self):
        """Test link string representation"""
        link = PageLink.objects.create(
            source=self.source_page,
            target=self.target_page
        )
        self.assertEqual(str(link), 'Source -> Target')

    def test_link_unique_constraint(self):
        """Test that duplicate links are not allowed"""
        PageLink.objects.create(source=self.source_page, target=self.target_page)
        with self.assertRaises(IntegrityError):
            PageLink.objects.create(source=self.source_page, target=self.target_page)

    def test_outgoing_links_relation(self):
        """Test outgoing_links reverse relation"""
        PageLink.objects.create(source=self.source_page, target=self.target_page)
        self.assertEqual(self.source_page.outgoing_links.count(), 1)

    def test_incoming_links_relation(self):
        """Test incoming_links reverse relation (backlinks)"""
        PageLink.objects.create(source=self.source_page, target=self.target_page)
        self.assertEqual(self.target_page.incoming_links.count(), 1)

    def test_link_cascade_delete_source(self):
        """Test that deleting source page deletes link"""
        link = PageLink.objects.create(source=self.source_page, target=self.target_page)
        link_id = link.id
        self.source_page.delete()
        self.assertFalse(PageLink.objects.filter(id=link_id).exists())

    def test_link_cascade_delete_target(self):
        """Test that deleting target page deletes link"""
        link = PageLink.objects.create(source=self.source_page, target=self.target_page)
        link_id = link.id
        self.target_page.delete()
        self.assertFalse(PageLink.objects.filter(id=link_id).exists())


class DatabaseModelTest(TestCase):
    """Tests for the Database model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.page = Page.objects.create(user=self.user, title='Database Page')

    def test_database_creation(self):
        """Test basic database creation"""
        db = Database.objects.create(page=self.page)
        self.assertEqual(db.page, self.page)
        self.assertEqual(db.default_view, 'table')

    def test_database_str_representation(self):
        """Test database string representation"""
        db = Database.objects.create(page=self.page)
        self.assertEqual(str(db), 'Database: Database Page')

    def test_database_with_schema(self):
        """Test database with proper schema"""
        schema = {
            'columns': [
                {'id': 'title', 'type': 'title', 'name': 'Name'},
                {'id': 'status', 'type': 'select', 'name': 'Status', 'options': [
                    {'id': 'opt1', 'value': 'Todo', 'color': 'gray'},
                    {'id': 'opt2', 'value': 'Done', 'color': 'green'}
                ]}
            ]
        }
        db = Database.objects.create(page=self.page, schema=schema)

        self.assertEqual(len(db.schema['columns']), 2)
        self.assertEqual(db.schema['columns'][0]['type'], 'title')

    def test_get_title_column(self):
        """Test get_title_column method"""
        schema = {
            'columns': [
                {'id': 'title', 'type': 'title', 'name': 'Name'},
                {'id': 'status', 'type': 'select', 'name': 'Status'}
            ]
        }
        db = Database.objects.create(page=self.page, schema=schema)

        title_col = db.get_title_column()
        self.assertIsNotNone(title_col)
        self.assertEqual(title_col['id'], 'title')
        self.assertEqual(title_col['type'], 'title')

    def test_get_title_column_no_title(self):
        """Test get_title_column when no title column exists"""
        schema = {
            'columns': [
                {'id': 'text1', 'type': 'text', 'name': 'Text'}
            ]
        }
        db = Database.objects.create(page=self.page, schema=schema)

        title_col = db.get_title_column()
        self.assertIsNone(title_col)

    def test_database_default_view_choices(self):
        """Test database view type choices"""
        for view in ['table', 'kanban', 'calendar']:
            db = Database.objects.create(
                page=Page.objects.create(user=self.user, title=f'{view} page'),
                default_view=view
            )
            self.assertEqual(db.default_view, view)

    def test_database_one_to_one_page(self):
        """Test that page can only have one database"""
        Database.objects.create(page=self.page)
        with self.assertRaises(IntegrityError):
            Database.objects.create(page=self.page)

    def test_database_cascade_delete_page(self):
        """Test that deleting page deletes database"""
        db = Database.objects.create(page=self.page)
        db_id = db.id
        self.page.delete()
        self.assertFalse(Database.objects.filter(id=db_id).exists())


class DatabaseRowModelTest(TestCase):
    """Tests for the DatabaseRow model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.page = Page.objects.create(user=self.user, title='Database Page')
        self.schema = {
            'columns': [
                {'id': 'title', 'type': 'title', 'name': 'Name'},
                {'id': 'status', 'type': 'select', 'name': 'Status'}
            ]
        }
        self.database = Database.objects.create(page=self.page, schema=self.schema)

    def test_row_creation(self):
        """Test basic row creation"""
        row = DatabaseRow.objects.create(database=self.database)
        self.assertEqual(row.database, self.database)
        self.assertEqual(row.position, 0)
        self.assertEqual(row.data, {})

    def test_row_with_data(self):
        """Test row with data"""
        data = {'title': 'Task 1', 'status': 'opt1'}
        row = DatabaseRow.objects.create(database=self.database, data=data)

        self.assertEqual(row.data['title'], 'Task 1')
        self.assertEqual(row.data['status'], 'opt1')

    def test_row_str_with_title(self):
        """Test row string representation with title"""
        data = {'title': 'My Task'}
        row = DatabaseRow.objects.create(database=self.database, data=data)
        self.assertEqual(str(row), 'My Task')

    def test_row_str_without_title_column(self):
        """Test row string representation without title column"""
        db = Database.objects.create(
            page=Page.objects.create(user=self.user, title='No Title Col'),
            schema={'columns': [{'id': 'text', 'type': 'text', 'name': 'Text'}]}
        )
        row = DatabaseRow.objects.create(database=db, data={'text': 'value'})
        self.assertEqual(str(row), f'Row {row.id}')

    def test_row_position_ordering(self):
        """Test rows are ordered by position"""
        row1 = DatabaseRow.objects.create(database=self.database, position=2)
        row2 = DatabaseRow.objects.create(database=self.database, position=1)
        row3 = DatabaseRow.objects.create(database=self.database, position=0)

        rows = list(self.database.rows.all())
        self.assertEqual(rows[0], row3)
        self.assertEqual(rows[1], row2)
        self.assertEqual(rows[2], row1)

    def test_row_cascade_delete_database(self):
        """Test that deleting database deletes rows"""
        row = DatabaseRow.objects.create(database=self.database)
        row_id = row.id
        self.database.delete()
        self.assertFalse(DatabaseRow.objects.filter(id=row_id).exists())

    def test_multiple_rows_different_positions(self):
        """Test creating multiple rows with different positions"""
        for i in range(5):
            DatabaseRow.objects.create(
                database=self.database,
                position=i,
                data={'title': f'Task {i}'}
            )

        self.assertEqual(self.database.rows.count(), 5)
