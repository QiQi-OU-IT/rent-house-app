from rest_framework import permissions
from rent_house.models import Role

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.author == request.user

class IsOwnerOrAdminOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if request.user.is_superuser:
            return True
            
        if request.user.role in [Role.ADMIN.value[0], Role.MODERATOR.value[0]]:
            return True
            
        if hasattr(obj, 'author'):
            return obj.author == request.user
            
        return False

class IsOwnerOfHouseOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        if not request.user.is_authenticated:
            return False
            
        if request.user.role != Role.OWNER.value[0]:
            return False
            
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
            
        return False

class IsOwnerRoleOrReadOnly(permissions.BasePermission):
    """
    Custom permission chỉ cho phép user có role OWNER tạo mới house/room.
    """
    def has_permission(self, request, view):
        # Read permissions được cho phép với mọi request
        if request.method in permissions.SAFE_METHODS:
            return True

        # Chỉ user đã đăng nhập và có role OWNER mới có thể tạo
        return request.user.is_authenticated and request.user.role == Role.OWNER.value[0]

class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object to edit or delete it.
    """
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
            
        # Write permissions are only allowed to the owner
        return obj.sender == request.user