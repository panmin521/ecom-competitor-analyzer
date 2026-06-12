import argparse
import os
from typing import Annotated, TypedDict

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_tavily import TavilySearch
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages

load_dotenv()


def _llm():
    return ChatOpenAI(
        model="deepseek-chat",
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        base_url="https://api.deepseek.com",
        temperature=0,
    )


class AnalysisState(TypedDict):
    messages: Annotated[list, add_messages]
    product: str
    category: str
    competitors: list[str]
    analyses: dict[str, str]
    report: str


def search_competitors(state: AnalysisState) -> AnalysisState:
    tool = TavilySearch(max_results=8)
    results = tool.invoke(f"best {state['category']} products Amazon top sellers competitors")
    if isinstance(results, dict):
        results = results.get("results", [])

    content = "\n".join(r.get("content", "")[:300] for r in results)
    resp = _llm().invoke([
        SystemMessage(content="Extract exactly 5 competitor product brand names from the search results. Return only a comma-separated list of brand/product names, nothing else."),
        HumanMessage(content=f"Product category: {state['category']}\nSearch results:\n{content}"),
    ])
    competitors = [c.strip() for c in resp.content.split(",")][:5]
    return {"competitors": competitors}


def analyze_each(state: AnalysisState) -> AnalysisState:
    tool = TavilySearch(max_results=4)
    analyses = {}

    for competitor in state["competitors"]:
        results = tool.invoke(f"{competitor} {state['category']} price rating reviews pros cons Amazon")
        if isinstance(results, dict):
            results = results.get("results", [])
        content = "\n".join(r.get("content", "")[:400] for r in results)

        resp = _llm().invoke([
            SystemMessage(content="You are an e-commerce analyst. Extract from the search data: price range, customer rating, top 3 selling points, top 2 weaknesses. Be concise, under 80 words."),
            HumanMessage(content=f"Competitor: {competitor}\nData:\n{content}"),
        ])
        analyses[competitor] = resp.content

    return {"analyses": analyses}


def generate_report(state: AnalysisState) -> AnalysisState:
    analyses_text = "\n\n".join(f"**{k}:**\n{v}" for k, v in state["analyses"].items())

    resp = _llm().invoke([
        SystemMessage(content="""You are a senior e-commerce strategist. Generate a competitive analysis report with these sections:

## Executive Summary
2-3 sentences on the competitive landscape.

## Competitor Comparison Table
| Competitor | Price Range | Rating | Key Strengths | Weaknesses |
(fill in all 5 competitors)

## Market Gaps & Opportunities
3 bullet points of underserved niches or unmet customer needs.

## Differentiation Strategy for {product}
5 specific, actionable recommendations to stand out.

## Pricing Strategy
Recommended price positioning with rationale.

Write in English. Be specific and actionable.""".replace("{product}", state["product"])),
        HumanMessage(content=f"My product: {state['product']}\nCategory: {state['category']}\n\nCompetitor analyses:\n{analyses_text}"),
    ])

    return {"report": resp.content, "messages": [resp]}


def build_graph():
    graph = StateGraph(AnalysisState)
    graph.add_node("search", search_competitors)
    graph.add_node("analyze", analyze_each)
    graph.add_node("report", generate_report)
    graph.set_entry_point("search")
    graph.add_edge("search", "analyze")
    graph.add_edge("analyze", "report")
    graph.add_edge("report", END)
    return graph.compile()


def run(product: str, category: str) -> dict:
    result = build_graph().invoke({
        "product": product,
        "category": category,
        "messages": [],
        "competitors": [],
        "analyses": {},
        "report": "",
    })
    return {"report": result["report"], "competitors": result["competitors"]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--product", default="Wireless Earbuds")
    parser.add_argument("--category", default="consumer electronics")
    args = parser.parse_args()

    print(f"\nAnalyzing competitors for: {args.product} ({args.category})\n")
    result = run(args.product, args.category)
    print(f"Competitors: {', '.join(result['competitors'])}\n")
    print("=" * 60)
    print(result["report"])
