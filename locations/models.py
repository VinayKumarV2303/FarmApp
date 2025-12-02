from django.db import models


class State(models.Model):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class District(models.Model):
    state = models.ForeignKey(
        State,
        related_name="districts",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("state", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}, {self.state.name}"


class Village(models.Model):
    district = models.ForeignKey(
        District,
        related_name="villages",
        on_delete=models.CASCADE,
    )
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ("district", "name")
        ordering = ["name"]

    def __str__(self):
        return f"{self.name}, {self.district.name}"
