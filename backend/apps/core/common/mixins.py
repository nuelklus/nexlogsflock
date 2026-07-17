class AuditUserMixin:


    def perform_create(self, serializer):

        serializer.save(
            tenant=self.request.tenant,
            created_by=self.request.user,
            updated_by=self.request.user,
        )


    def perform_update(self, serializer):

        serializer.save(
            updated_by=self.request.user,
        )