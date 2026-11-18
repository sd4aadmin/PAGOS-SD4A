import enum
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

# Mismo tope de sanidad que los pagos: 100.000 millones COP
MAX_AMOUNT = Decimal("100000000000")


class ChangeResponsible(str, enum.Enum):
    CLIENT = "CLIENT"
    SD4A = "SD4A"


class ProjectChangeCreate(BaseModel):
    description: str = Field(min_length=3, max_length=1000)
    responsible: ChangeResponsible
    amount: Decimal = Field(default=Decimal("0"), ge=0, le=MAX_AMOUNT)

    @model_validator(mode="after")
    def _coherent_amount(self):
        if self.responsible == ChangeResponsible.SD4A:
            # Error de SD4A: no se cobra, sin importar lo que llegue del formulario
            self.amount = Decimal("0")
        elif self.amount <= 0:
            raise ValueError("Un cambio a cargo del cliente debe tener un valor mayor a 0")
        return self


class ProjectChangeOut(BaseModel):
    id: str
    project_id: str
    description: str
    responsible: ChangeResponsible
    amount: Decimal
    charged: bool
    created_by_name: str | None = None
    created_at: datetime
