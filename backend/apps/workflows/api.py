from ninja import Router, Schema
from django.shortcuts import get_object_or_404
from django.utils import timezone
from typing import List, Optional
from datetime import datetime, date, timedelta

from .models import (
    WorkflowCategory,
    WorkflowTemplate,
    WorkflowTemplateStep,
    WorkflowInstance,
    WorkflowInstanceStep,
)

router = Router()


# ============= Schemas =============

class ErrorSchema(Schema):
    error: str


class SuccessSchema(Schema):
    success: bool


# Category Schemas
class CategorySchema(Schema):
    id: int
    name: str
    color: str
    created_at: datetime


class CategoryCreateSchema(Schema):
    name: str
    color: Optional[str] = 'violet'


class CategoryUpdateSchema(Schema):
    name: Optional[str] = None
    color: Optional[str] = None


# Template Step Schemas
class TemplateStepSchema(Schema):
    id: int
    parent_id: Optional[int]
    title: str
    description: str
    position: int
    default_days_offset: int


class TemplateStepCreateSchema(Schema):
    parent_id: Optional[int] = None
    title: str
    description: Optional[str] = ''
    position: Optional[int] = 0
    default_days_offset: Optional[int] = 0


class TemplateStepUpdateSchema(Schema):
    title: Optional[str] = None
    description: Optional[str] = None
    position: Optional[int] = None
    default_days_offset: Optional[int] = None


class StepReorderSchema(Schema):
    step_ids: List[int]


# Template Schemas
class TemplateSchema(Schema):
    id: int
    category_id: Optional[int]
    category_name: Optional[str]
    name: str
    description: str
    steps: List[TemplateStepSchema]
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_category_name(obj):
        return obj.category.name if obj.category else None


class TemplateListSchema(Schema):
    id: int
    category_id: Optional[int]
    category_name: Optional[str]
    name: str
    description: str
    step_count: int
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_category_name(obj):
        return obj.category.name if obj.category else None

    @staticmethod
    def resolve_step_count(obj):
        return obj.steps.count()


class TemplateCreateSchema(Schema):
    name: str
    description: Optional[str] = ''
    category_id: Optional[int] = None


class TemplateUpdateSchema(Schema):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None


# Instance Step Schemas
class InstanceStepSchema(Schema):
    id: int
    parent_id: Optional[int]
    title: str
    description: str
    position: int
    is_completed: bool
    completed_at: Optional[datetime]
    due_date: Optional[date]
    notes: str


class InstanceStepUpdateSchema(Schema):
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    due_date: Optional[date] = None


# Instance Schemas
class InstanceSchema(Schema):
    id: int
    template_id: Optional[int]
    template_name: Optional[str]
    name: str
    customer_id: Optional[int]
    customer_name: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    status: str
    progress: int
    steps: List[InstanceStepSchema]
    started_at: datetime
    completed_at: Optional[datetime]

    @staticmethod
    def resolve_template_name(obj):
        return obj.template.name if obj.template else None

    @staticmethod
    def resolve_customer_name(obj):
        return obj.customer.name if obj.customer else None

    @staticmethod
    def resolve_project_name(obj):
        return obj.project.name if obj.project else None


class InstanceListSchema(Schema):
    id: int
    template_id: Optional[int]
    name: str
    customer_id: Optional[int]
    customer_name: Optional[str]
    project_id: Optional[int]
    project_name: Optional[str]
    status: str
    progress: int
    started_at: datetime
    completed_at: Optional[datetime]

    @staticmethod
    def resolve_customer_name(obj):
        return obj.customer.name if obj.customer else None

    @staticmethod
    def resolve_project_name(obj):
        return obj.project.name if obj.project else None


class InstanceCreateSchema(Schema):
    template_id: int
    name: Optional[str] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None


class InstanceUpdateSchema(Schema):
    name: Optional[str] = None
    status: Optional[str] = None
    customer_id: Optional[int] = None
    project_id: Optional[int] = None


# Stats Schema
class CategoryStatsSchema(Schema):
    category_id: Optional[int]
    category_name: str
    count: int
    avg_progress: float


class StatsSchema(Schema):
    total_active: int
    total_completed: int
    by_category: List[CategoryStatsSchema]
    overdue_steps: int


# ============= Category Endpoints =============

@router.get('/categories', response=List[CategorySchema])
def list_categories(request):
    """List all workflow categories"""
    return WorkflowCategory.objects.filter(user=request.user)


@router.post('/categories', response={201: CategorySchema, 400: ErrorSchema})
def create_category(request, data: CategoryCreateSchema):
    """Create a new workflow category"""
    category = WorkflowCategory.objects.create(
        user=request.user,
        name=data.name,
        color=data.color or 'violet',
    )
    return 201, category


@router.put('/categories/{category_id}', response={200: CategorySchema, 404: ErrorSchema})
def update_category(request, category_id: int, data: CategoryUpdateSchema):
    """Update a workflow category"""
    category = get_object_or_404(WorkflowCategory, id=category_id, user=request.user)

    if data.name is not None:
        category.name = data.name
    if data.color is not None:
        category.color = data.color

    category.save()
    return category


@router.delete('/categories/{category_id}', response={200: SuccessSchema, 404: ErrorSchema})
def delete_category(request, category_id: int):
    """Delete a workflow category"""
    category = get_object_or_404(WorkflowCategory, id=category_id, user=request.user)
    category.delete()
    return {'success': True}


# ============= Template Endpoints =============

@router.get('/templates', response=List[TemplateListSchema])
def list_templates(request, category_id: Optional[int] = None):
    """List all workflow templates"""
    templates = WorkflowTemplate.objects.filter(user=request.user)

    if category_id:
        templates = templates.filter(category_id=category_id)

    return templates


@router.post('/templates', response={201: TemplateSchema, 400: ErrorSchema})
def create_template(request, data: TemplateCreateSchema):
    """Create a new workflow template"""
    category = None
    if data.category_id:
        category = get_object_or_404(WorkflowCategory, id=data.category_id, user=request.user)

    template = WorkflowTemplate.objects.create(
        user=request.user,
        category=category,
        name=data.name,
        description=data.description or '',
    )
    return 201, template


@router.get('/templates/{template_id}', response={200: TemplateSchema, 404: ErrorSchema})
def get_template(request, template_id: int):
    """Get a single workflow template with steps"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)
    return template


@router.put('/templates/{template_id}', response={200: TemplateSchema, 404: ErrorSchema})
def update_template(request, template_id: int, data: TemplateUpdateSchema):
    """Update a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)

    if data.name is not None:
        template.name = data.name
    if data.description is not None:
        template.description = data.description
    if data.category_id is not None:
        if data.category_id == 0:
            template.category = None
        else:
            template.category = get_object_or_404(
                WorkflowCategory, id=data.category_id, user=request.user
            )

    template.save()
    return template


@router.delete('/templates/{template_id}', response={200: SuccessSchema, 404: ErrorSchema})
def delete_template(request, template_id: int):
    """Delete a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)
    template.delete()
    return {'success': True}


# ============= Template Step Endpoints =============

@router.post('/templates/{template_id}/steps', response={201: TemplateStepSchema, 404: ErrorSchema})
def create_template_step(request, template_id: int, data: TemplateStepCreateSchema):
    """Create a step in a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)

    parent = None
    if data.parent_id:
        parent = get_object_or_404(WorkflowTemplateStep, id=data.parent_id, template=template)

    # Auto-set position if not provided
    position = data.position
    if position == 0:
        existing = WorkflowTemplateStep.objects.filter(template=template, parent=parent)
        position = existing.count()

    step = WorkflowTemplateStep.objects.create(
        template=template,
        parent=parent,
        title=data.title,
        description=data.description or '',
        position=position,
        default_days_offset=data.default_days_offset or 0,
    )
    return 201, step


@router.put('/templates/{template_id}/steps/{step_id}', response={200: TemplateStepSchema, 404: ErrorSchema})
def update_template_step(request, template_id: int, step_id: int, data: TemplateStepUpdateSchema):
    """Update a step in a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)
    step = get_object_or_404(WorkflowTemplateStep, id=step_id, template=template)

    if data.title is not None:
        step.title = data.title
    if data.description is not None:
        step.description = data.description
    if data.position is not None:
        step.position = data.position
    if data.default_days_offset is not None:
        step.default_days_offset = data.default_days_offset

    step.save()
    return step


@router.delete('/templates/{template_id}/steps/{step_id}', response={200: SuccessSchema, 404: ErrorSchema})
def delete_template_step(request, template_id: int, step_id: int):
    """Delete a step from a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)
    step = get_object_or_404(WorkflowTemplateStep, id=step_id, template=template)
    step.delete()
    return {'success': True}


@router.post('/templates/{template_id}/steps/reorder', response={200: SuccessSchema, 404: ErrorSchema})
def reorder_template_steps(request, template_id: int, data: StepReorderSchema):
    """Reorder steps in a workflow template"""
    template = get_object_or_404(WorkflowTemplate, id=template_id, user=request.user)

    for index, step_id in enumerate(data.step_ids):
        WorkflowTemplateStep.objects.filter(id=step_id, template=template).update(position=index)

    return {'success': True}


# ============= Instance Endpoints =============

@router.get('/instances', response=List[InstanceListSchema])
def list_instances(request, status: Optional[str] = None, category_id: Optional[int] = None):
    """List all workflow instances"""
    instances = WorkflowInstance.objects.filter(user=request.user)

    if status:
        instances = instances.filter(status=status)

    if category_id:
        instances = instances.filter(template__category_id=category_id)

    return instances


@router.post('/instances', response={201: InstanceSchema, 400: ErrorSchema, 404: ErrorSchema})
def create_instance(request, data: InstanceCreateSchema):
    """Create a new workflow instance from a template"""
    template = get_object_or_404(WorkflowTemplate, id=data.template_id, user=request.user)

    # Get customer and project if provided
    customer = None
    project = None

    if data.customer_id:
        from apps.customers.models import Customer
        customer = get_object_or_404(Customer, id=data.customer_id, user=request.user)

    if data.project_id:
        from apps.timetracking.models import Project
        project = get_object_or_404(Project, id=data.project_id, user=request.user)

    # Create instance
    instance = WorkflowInstance.objects.create(
        user=request.user,
        template=template,
        name=data.name or template.name,
        customer=customer,
        project=project,
    )

    # Copy steps from template
    start_date = timezone.now().date()
    template_steps = template.steps.filter(parent=None).order_by('position')

    step_mapping = {}  # template_step_id -> instance_step

    for template_step in template_steps:
        due_date = None
        if template_step.default_days_offset > 0:
            due_date = start_date + timedelta(days=template_step.default_days_offset)

        instance_step = WorkflowInstanceStep.objects.create(
            instance=instance,
            template_step=template_step,
            parent=None,
            title=template_step.title,
            description=template_step.description,
            position=template_step.position,
            due_date=due_date,
        )
        step_mapping[template_step.id] = instance_step

        # Create child steps
        for child in template_step.children.order_by('position'):
            child_due_date = None
            if child.default_days_offset > 0:
                child_due_date = start_date + timedelta(days=child.default_days_offset)

            WorkflowInstanceStep.objects.create(
                instance=instance,
                template_step=child,
                parent=instance_step,
                title=child.title,
                description=child.description,
                position=child.position,
                due_date=child_due_date,
            )

    return 201, instance


@router.get('/instances/{instance_id}', response={200: InstanceSchema, 404: ErrorSchema})
def get_instance(request, instance_id: int):
    """Get a single workflow instance with steps"""
    instance = get_object_or_404(WorkflowInstance, id=instance_id, user=request.user)
    return instance


@router.put('/instances/{instance_id}', response={200: InstanceSchema, 404: ErrorSchema})
def update_instance(request, instance_id: int, data: InstanceUpdateSchema):
    """Update a workflow instance"""
    instance = get_object_or_404(WorkflowInstance, id=instance_id, user=request.user)

    if data.name is not None:
        instance.name = data.name
    if data.status is not None:
        instance.status = data.status
        if data.status == 'completed':
            instance.completed_at = timezone.now()
        elif instance.completed_at and data.status != 'completed':
            instance.completed_at = None

    if data.customer_id is not None:
        if data.customer_id == 0:
            instance.customer = None
        else:
            from apps.customers.models import Customer
            instance.customer = get_object_or_404(Customer, id=data.customer_id, user=request.user)

    if data.project_id is not None:
        if data.project_id == 0:
            instance.project = None
        else:
            from apps.timetracking.models import Project
            instance.project = get_object_or_404(Project, id=data.project_id, user=request.user)

    instance.save()
    return instance


@router.delete('/instances/{instance_id}', response={200: SuccessSchema, 404: ErrorSchema})
def delete_instance(request, instance_id: int):
    """Delete a workflow instance"""
    instance = get_object_or_404(WorkflowInstance, id=instance_id, user=request.user)
    instance.delete()
    return {'success': True}


# ============= Instance Step Endpoints =============

@router.post('/instances/{instance_id}/steps/{step_id}/toggle', response={200: InstanceStepSchema, 404: ErrorSchema})
def toggle_instance_step(request, instance_id: int, step_id: int):
    """Toggle completion status of a step"""
    instance = get_object_or_404(WorkflowInstance, id=instance_id, user=request.user)
    step = get_object_or_404(WorkflowInstanceStep, id=step_id, instance=instance)

    step.is_completed = not step.is_completed
    step.completed_at = timezone.now() if step.is_completed else None
    step.save()

    # Check if all steps are completed
    all_completed = not instance.steps.filter(is_completed=False).exists()
    if all_completed and instance.status == 'active':
        instance.status = 'completed'
        instance.completed_at = timezone.now()
        instance.save()

    return step


@router.put('/instances/{instance_id}/steps/{step_id}', response={200: InstanceStepSchema, 404: ErrorSchema})
def update_instance_step(request, instance_id: int, step_id: int, data: InstanceStepUpdateSchema):
    """Update a step in a workflow instance"""
    instance = get_object_or_404(WorkflowInstance, id=instance_id, user=request.user)
    step = get_object_or_404(WorkflowInstanceStep, id=step_id, instance=instance)

    if data.title is not None:
        step.title = data.title
    if data.description is not None:
        step.description = data.description
    if data.notes is not None:
        step.notes = data.notes
    if data.due_date is not None:
        step.due_date = data.due_date

    step.save()
    return step


# ============= Stats Endpoint =============

@router.get('/stats', response=StatsSchema)
def get_stats(request):
    """Get workflow statistics"""
    instances = WorkflowInstance.objects.filter(user=request.user)

    total_active = instances.filter(status='active').count()
    total_completed = instances.filter(status='completed').count()

    # Get today for overdue calculation
    today = timezone.now().date()

    # Count overdue steps
    overdue_steps = WorkflowInstanceStep.objects.filter(
        instance__user=request.user,
        instance__status='active',
        is_completed=False,
        due_date__lt=today,
    ).count()

    # Stats by category
    from django.db.models import Avg, Count
    from django.db.models.functions import Coalesce

    categories = WorkflowCategory.objects.filter(user=request.user).annotate(
        workflow_count=Count('templates__instances', filter=models.Q(templates__instances__status='active'))
    )

    by_category = []

    for cat in categories:
        active_instances = instances.filter(template__category=cat, status='active')
        count = active_instances.count()
        if count > 0:
            avg_progress = sum(i.progress for i in active_instances) / count
        else:
            avg_progress = 0

        by_category.append({
            'category_id': cat.id,
            'category_name': cat.name,
            'count': count,
            'avg_progress': avg_progress,
        })

    # Also include uncategorized
    uncategorized = instances.filter(template__category=None, status='active')
    if uncategorized.exists():
        count = uncategorized.count()
        avg_progress = sum(i.progress for i in uncategorized) / count if count > 0 else 0
        by_category.append({
            'category_id': None,
            'category_name': 'Ohne Kategorie',
            'count': count,
            'avg_progress': avg_progress,
        })

    return {
        'total_active': total_active,
        'total_completed': total_completed,
        'by_category': by_category,
        'overdue_steps': overdue_steps,
    }
