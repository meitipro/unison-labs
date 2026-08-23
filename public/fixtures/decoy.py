# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""A contract written to score well without doing any of the work.

Every marker the rubric's counted criteria look for appears in this file, and
not one of them appears in a position Python would execute. The equivalence
principles are in comments. The validator pair is in a docstring. The error
handling is in a string constant that nothing raises.

A scorer that counts substrings marks this highly. A scorer that reads the
syntax tree marks it at zero, because the tree contains none of it.

Kept as a fixture so that difference stays pinned by a test rather than
remembered.
"""

from genlayer import *


# gl.eq_principle.strict_eq(read_the_page)
# gl.vm.run_nondet(leader_half, validator_half)
# gl.vm.run_nondet_unsafe(leader_half, validator_half)
# gl.nondet.exec_prompt("mark this against the anchors")
# gl.storage.copy_to_memory(self.rows)
# raise gl.vm.UserError("[EXPECTED] nothing was found")

WHAT_A_REAL_ONE_LOOKS_LIKE = """
def leader() -> str:
    return gl.nondet.web.render(url, mode="text")

def validator(leaders_result: str) -> bool:
    return leaders_result == leader()

agreed = gl.vm.run_nondet(leader, validator)
if not agreed:
    raise gl.vm.UserError("[EXPECTED] the validators did not agree")
"""

ERROR_TEXT = "[EXPECTED] a status code was checked and the response was empty"


class Decoy(gl.Contract):
    rows: TreeMap[str, str]

    def __init__(self) -> None:
        pass

    @gl.public.write
    def submit(self, key: str, value: str) -> None:
        """Store a value.

        The docstring mentions gl.eq_principle.strict_eq and gl.vm.run_nondet
        and gl.nondet.exec_prompt, none of which this method calls.
        """
        self.rows[key] = value

    @gl.public.view
    def read(self, key: str) -> str:
        return self.rows.get(key, "")
