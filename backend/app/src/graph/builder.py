import networkx as nx
from typing import Dict, Any

def build_identity_graph(candidate_name: str, platforms_found: Dict[str, str], db_matches: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Builds a NetworkX property graph linking the primary identity to discovered accounts.
    Returns it as a JSON payload for D3.js frontend visualization.
    """
    G = nx.Graph()
    
    # Root Node
    root_id = candidate_name.lower().replace(" ", "_")
    G.add_node(root_id, label="Person", title=candidate_name)
    
    # Add nodes for each platform found
    for platform, url in platforms_found.items():
        node_id = f"{platform}_{root_id}"
        G.add_node(node_id, label="Platform", title=platform, url=url)
        G.add_edge(root_id, node_id, relationship="OWNS_ACCOUNT")
        
    # Add VectorDB matching node if applicable
    if db_matches and "db_id" in db_matches:
        db_node_id = db_matches["db_id"]
        G.add_node(db_node_id, label="Database Match", title="ChromaDB Face Match")
        G.add_edge(root_id, db_node_id, relationship="MATCHES_FACE")

    # Serialize to D3.js compatible node/link format
    data = nx.node_link_data(G)
    return data
