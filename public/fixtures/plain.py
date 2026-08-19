"""
One that isn't an Intelligent Contract. Fixture three: 2 of 6 at the gate, and
refused before scoring.

It is a perfectly reasonable deterministic contract. It never reaches outside
the deterministic world, it never says how validators are meant to agree, and
it carries no runner header, so there is nothing here for a jury to do. The
gate stops it before a validator spends an inference on it, which is the whole
reason the gate exists.

This is the fixture most likely to be quietly broken by a later change, because
nobody demos a refusal.
"""

from genlayer import *


class Counter(gl.Contract):
    def __init__(self):
        self.value = 0
        self.owner = gl.message.sender_address

    @gl.public.view
    def get(self) -> int:
        return self.value

    @gl.public.write
    def add(self, amount: int):
        if amount <= 0:
            raise gl.vm.UserError("amount must be positive")
        self.value = self.value + amount

    @gl.public.write
    def reset(self):
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError("only the owner may reset")
        self.value = 0
