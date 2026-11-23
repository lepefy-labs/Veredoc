# Collaudo del riordino delle guide pubbliche

Il riordino riceve un argomento predefinito e istruzioni pubbliche. L’ordine di riferimento è quello editoriale delle prime tre istruzioni. I test automatici fissano le edizioni e simulano gli indici restituiti dal provider.

| Guida | Argomento | Candidati | Risultato da valutare con il provider |
|---|---|---:|---|
| Preparazione DSU | Passaggi | 4 | Conservare accesso, apertura della DSU e verifica prima dell’invio. |
| Bonus nido | Documenti | 5 | Includere sia il documento di spesa sia la prova del pagamento tracciabile. |
| Bonus nido | Passaggi | 4 | Conservare l’ordine fra verifica del richiedente, domanda e allegati. |

Controlli deterministici con al massimo tre candidati. Preparazione DSU per documenti e presentazione, ISEE corrente per passaggi e assegno unico per documenti. Il mock prova quali istruzioni il sistema mostra per un determinato risultato e il rifiuto degli indici non validi.

Per la prova con Anthropic, concordare prima il budget, scegliere il modello e usare un ambiente isolato con account di prova. Registrare adeguatezza delle prime tre istruzioni, ordine dei prerequisiti, fallback, latenza e token. Confrontare i risultati con l’ordine editoriale e promuovere il riordino solo se mantiene la copertura delle istruzioni essenziali e rispetta il budget concordato.
