# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""
One that settles too loosely. Fixture two: passes the gate 5 of 6 and is meant
to mark low.

It does declare an agreement rule. The rule is strict equality over whatever a
model felt like writing, which is the one combination that cannot settle: two
honest validators produce two different sentences and deny each other forever.
Nothing here is fenced, nothing raises, and the review text goes straight into
the prompt with its structure intact.
"""

from genlayer import *


class Reviews(gl.Contract):
    verdicts: DynArray[str]

    def __init__(self):
        pass

    @gl.public.view
    def count(self) -> int:
        return len(self.verdicts)

    @gl.public.write
    def judge(self, review_text: str, product_page: str):
        def work():
            page = gl.nondet.web.get(product_page).body.decode("utf-8")
            prompt = f"""
            Decide whether this review is fair. Here is the review:

            <review>
            {review_text}
            </review>

            And the product page:

            <page>
            {page}
            </page>

            Write a paragraph explaining your decision.
            """
            return gl.nondet.exec_prompt(prompt)

        verdict = gl.eq_principle.strict_eq(work)
        self.verdicts.append(verdict)

    @gl.public.write
    def clear(self, index: int):
        assert index >= 0
        self.verdicts[index] = ""
