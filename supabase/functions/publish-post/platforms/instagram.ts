export async function publishInstagram(content: any,media: string | any[],connection: { platform_user_id: any; access_token: any }){

if(!media.length){

return{
success:false,
error:"Instagram requer imagem"
}

}

const container=await fetch(
`https://graph.facebook.com/v21.0/${connection.platform_user_id}/media`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
image_url:media[0],
caption:content,
access_token:connection.access_token
})
}
)

const containerData=await container.json()

const publish=await fetch(
`https://graph.facebook.com/v21.0/${connection.platform_user_id}/media_publish`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
creation_id:containerData.id,
access_token:connection.access_token
})
}
)

const data=await publish.json()

return{
success:true,
postId:data.id
}

}