from django.contrib import admin
from django.urls import include, path, re_path
from oauth2_provider import urls as oauth2_urls
from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi
import debug_toolbar

schema_view = get_schema_view(
    openapi.Info(
        title="Rent House API",
        default_version='v1',
        description="API documentation for the Rent House project",
        contact=openapi.Contact(email="trieukon1011@gmail.com"),
        license=openapi.License(name="Nguyen Thanh Trieu"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    path('o/', include(oauth2_urls)),
    path('api/', include('rent_house.urls')),
    path('admin/', admin.site.urls),
    re_path(r'^ckeditor/', include('ckeditor_uploader.urls')),
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0),
            name='schema-json'),
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0),
            name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0),
            name='schema-redoc'),
    path('__debug__/', include(debug_toolbar.urls))
]
