# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""A contract that does the work in the tree and none of it at runtime.

`decoy.py` hides its markers where Python never looks: comments, docstrings,
string constants. Parsing the source is enough to see through that, and it is
what the rubric was rewritten to do.

This file is the next move. Every marker here is REAL CODE. It parses, it is
syntactically valid, and `ast.walk` finds every one of it: an equivalence
principle, a validator pair, a prompt, a copy to memory, a classified raise.
None of them can ever run. They sit after a `return`, or inside `if False:`,
so the interpreter reaches the end of each method without touching a single
one.

A scorer that counts nodes in the tree marks this highly, exactly as a
substring scorer marks the decoy highly. A scorer that prunes to what the
language can reach marks it at zero.

Kept as a fixture because the distinction it pins is easy to lose: parsing is
not the same as reachability, and the second one is what "executable
structure" actually means.
"""

from genlayer import *

import json


ERROR_EXPECTED = "[EXPECTED]"


def _leader() -> str:
    return gl.nondet.exec_prompt("Summarise this and return json")


def _validator(leaders: str) -> bool:
    return leaders == _leader()


class DeadCode(gl.Contract):
    entries: DynArray[str]
    index: TreeMap[str, u32]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def submit(self, key: str, body: str) -> None:
        """Stores what it is handed. Everything careful about it is unreachable."""
        self.index[key] = u32(len(self.entries))
        self.entries.append(json.dumps({"key": key, "body": body}, sort_keys=True))
        return

        # Nothing below this line is ever executed. It is here so that a scorer
        # reading the tree without pruning it finds a careful contract.
        held = gl.storage.copy_to_memory(self.entries)
        fenced = body.replace("<", "(").replace(">", ")")
        agreed = gl.vm.run_nondet(_leader, _validator)
        checked = gl.eq_principle.strict_eq(lambda: gl.nondet.web.get(fenced).body)
        if not agreed:
            raise gl.vm.UserError(ERROR_EXPECTED + " the validators did not agree")
        if checked.status != 200:
            raise gl.vm.UserError(ERROR_EXPECTED + " the source did not answer")
        self.entries.append(str(held))

    @gl.public.write
    def refresh(self, key: str) -> None:
        """The same trick under a constant condition rather than after a return."""
        if False:
            page = gl.nondet.web.render(key, mode="text")
            fenced = page.replace("<", "(").replace(">", ")")
            marked = gl.eq_principle.prompt_comparative(
                lambda: gl.nondet.exec_prompt(fenced), "the same answer"
            )
            if marked is None:
                raise gl.vm.UserError(ERROR_EXPECTED + " nothing came back")
            self.entries.append(str(marked))
        self.index[key] = u32(0)

    @gl.public.view
    def read(self, key: str) -> str:
        at = self.index.get(key)
        if at is None:
            return ""
        return self.entries[int(at)]
