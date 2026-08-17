from django.core.management.base import BaseCommand

from apps.finance.expense.models import ExpenseCategory


class Command(BaseCommand):
    help = "Seed the global expense categories used across all tenants."

    DEFAULT_CATEGORIES = [
        ("Feed", "Poultry feed and feed-related purchases."),
        ("Medication", "Medicines and treatments for birds."),
        ("Vaccination", "Vaccines and vaccination-related costs."),
        ("Labor", "Farm worker wages and labor costs."),
        ("Utilities", "General utility expenses."),
        ("Water", "Water supply and water-related expenses."),
        ("Electricity", "Electricity and power expenses."),
        ("Transportation", "Transport, fuel, delivery, and logistics expenses."),
        ("Equipment", "Farm equipment and tools."),
        ("Repairs & Maintenance", "Repairs and maintenance of farm infrastructure and equipment."),
        ("Cleaning", "Cleaning materials and sanitation expenses."),
        ("Farm Supplies", "General farm supplies and consumables."),
        ("Housing", "Poultry house construction, maintenance, and housing-related costs."),
        ("Veterinary", "Veterinary services and professional animal-health services."),
        ("Other", "Expenses that do not fit another category."),
    ]

    @staticmethod
    def normalize_name(name):
        return " ".join(str(name).split()).strip()

    def handle(self, *args, **options):
        created = 0
        already_exists = 0

        for raw_name, description in self.DEFAULT_CATEGORIES:
            normalized_name = self.normalize_name(raw_name)
            if not normalized_name:
                continue

            existing = next(
                (
                    category
                    for category in ExpenseCategory.objects.all()
                    if category.name.strip().casefold() == normalized_name.casefold()
                ),
                None,
            )

            if existing is not None:
                already_exists += 1
                continue

            ExpenseCategory.objects.create(
                name=normalized_name,
                description=description,
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Expense categories seeded successfully.\n"
                f"Created: {created}\n"
                f"Already existed: {already_exists}"
            )
        )
